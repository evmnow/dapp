#!/usr/bin/env node

// Publish the dapp to IPFS and point the ENS name at the new build.
//
// Runs `pnpm generate`, uploads .output/public to the self-hosted IPFS node
// (admin credentials from ~/1001/ipfs-server/.env.production, override with
// IPFS_ENV_PATH), pins the result, and updates the ENS contenthash on mainnet.
//
// The signing key is read from the hardhat v3 keystore
// (~/.config/hardhat-nodejs/keystore.json, secret DEPLOYER_1001_PRIVATE_KEY)
// after an interactive password prompt, so it never touches shell history or
// the environment. For non-interactive runs the DEPLOYER_1001_PRIVATE_KEY env
// var is honored instead; it is stripped from the build's child environment.
//
// Overrides:
//   PUBLISH_SITE_ENS_NAME           target ENS name (default evmnow.eth)
//   PUBLISH_SITE_MFS_PARENT         MFS directory on the IPFS node (default /<ens name>)
//   PUBLISH_SITE_TIMESTAMP          fixed timestamp for the MFS dist dir
//   PUBLISH_SITE_RPC_URL            mainnet RPC (default from .env NUXT_PUBLIC_MAINNET_ENS_RPC)
//   PUBLISH_SITE_ALLOW_NON_MAINNET  set to 1 for a fork/test run
//   PUBLISH_SITE_KEYSTORE_PATH      hardhat keystore file
//   PUBLISH_SITE_KEYSTORE_SECRET    keystore secret name (default DEPLOYER_1001_PRIVATE_KEY)

import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { appendFile, readdir, readFile, rm, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, join, posix, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { siv } from '@noble/ciphers/aes'
import { hmac } from '@noble/hashes/hmac'
import { scrypt } from '@noble/hashes/scrypt'
import { sha256 } from '@noble/hashes/sha2'
import {
  bytesToHex as nobleBytesToHex,
  hexToBytes as nobleHexToBytes,
} from '@noble/hashes/utils'
import {
  bytesToHex,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  getAddress,
  http,
  namehash,
  parseAbi,
  zeroAddress,
  type Address,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet } from 'viem/chains'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const DAPP_DIR = resolve(SCRIPT_DIR, '..')
const OUTPUT_DIR = resolve(DAPP_DIR, '.output', 'public')

const DEFAULT_IPFS_ENV_PATH = resolve(
  homedir(),
  '1001/ipfs-server/.env.production',
)

const DEFAULT_KEYSTORE_PATH = resolve(
  homedir(),
  '.config/hardhat-nodejs/keystore.json',
)
const KEYSTORE_VERSION = 'hardhat-v3-keystore-1'
const SIGNER_KEY_NAME = 'DEPLOYER_1001_PRIVATE_KEY'

const ENS_REGISTRY = getAddress('0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e')
const CONTENTHASH_INTERFACE_ID = '0xbc1c58d1' as const
const IPFS_NS_CODEC = 0xe3
const DAG_PB_CODEC = 0x70

const ENS_REGISTRY_ABI = parseAbi([
  'function owner(bytes32 node) view returns (address)',
  'function resolver(bytes32 node) view returns (address)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function setApprovalForAll(address operator, bool approved)',
])

const RESOLVER_ABI = parseAbi([
  'function contenthash(bytes32 node) view returns (bytes)',
  'function setContenthash(bytes32 node, bytes hash)',
  'function supportsInterface(bytes4 interfaceID) view returns (bool)',
])

// Record-edit authorization across PublicResolver generations: PR2 (2019) uses
// node-scoped authorisations, the NameWrapper-era resolver uses operator
// approvals, the 2023 resolver adds per-node delegates.
const RESOLVER_AUTH_ABI = parseAbi([
  'function authorisations(bytes32 node, address owner, address target) view returns (bool)',
  'function setAuthorisation(bytes32 node, address target, bool isAuthorised)',
  'function isApprovedForAll(address account, address operator) view returns (bool)',
  'function isApprovedFor(address owner, bytes32 node, address delegate) view returns (bool)',
  'function approve(bytes32 node, address delegate, bool approved)',
])

type EnvMap = Record<string, string>
type EnvLike = Record<string, string | undefined>

type IpfsEnv = {
  adminHost: string
  gatewayHost: string
  user: string
  password: string
  envPath: string
}

type Signer = {
  account: ReturnType<typeof privateKeyToAccount>
  rpcUrl: string
}

type EncryptedData = {
  iv: string
  cypherText: string
}

type Keystore = {
  version: string
  crypto: {
    masterKeyDerivation: {
      salt: string
      paramN: number
      paramR: number
      paramP: number
      keyLength: number
      unicodeNormalizationForm: string
    }
  }
  hmacKey: EncryptedData
  dataEncryptionKey: EncryptedData
  secrets: Record<string, EncryptedData>
  hmac: string
}

type FileEntry = {
  path: string
  relativePath: string
  size: number
}

type FilesStatResponse = {
  Hash?: string
  Cid?: { '/': string } | string
}

async function main() {
  const ensName = process.env.PUBLISH_SITE_ENS_NAME ?? 'evmnow.eth'
  const mfsParent = normalizeMfsPath(
    process.env.PUBLISH_SITE_MFS_PARENT ?? `/${ensName}`,
  )
  const timestamp =
    process.env.PUBLISH_SITE_TIMESTAMP ?? formatTimestamp(new Date())
  if (!/^[A-Za-z0-9._-]+$/.test(timestamp)) {
    throw new Error(`Unsafe timestamp for an MFS path: ${timestamp}`)
  }
  const mfsPath = posix.join(mfsParent, `dist-${timestamp}`)

  const ipfsEnvPath = process.env.IPFS_ENV_PATH
    ? resolve(process.env.IPFS_ENV_PATH)
    : DEFAULT_IPFS_ENV_PATH
  const ipfsEnv = loadIpfsEnv(ipfsEnvPath)
  const signer = await loadSigner()
  const ens = await preflightEns(signer, ensName)

  console.log(`ENS name     ${ensName}`)
  console.log(`MFS path     ${mfsPath}`)
  console.log(`IPFS API     https://${ipfsEnv.adminHost}`)
  console.log(`IPFS gateway https://${ipfsEnv.gatewayHost}`)

  await generateStaticSite()

  const files = await collectFiles(OUTPUT_DIR)
  if (files.length === 0) {
    throw new Error(`No generated files found in ${OUTPUT_DIR}`)
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0)
  console.log(
    `Uploading   ${files.length} files (${formatBytes(totalBytes)}) from ${relative(
      DAPP_DIR,
      OUTPUT_DIR,
    )}`,
  )
  const cid = await uploadDirectory(ipfsEnv, OUTPUT_DIR, files, mfsPath)
  const contenthash = encodeIpfsContenthash(cid)

  console.log(`CID         ${cid}`)
  console.log(`Contenthash ${contenthash}`)
  console.log(`Gateway     https://${ipfsEnv.gatewayHost}/ipfs/${cid}/`)

  await logUpload(ipfsEnv, cid, mfsPath, OUTPUT_DIR)
  await updateEnsContenthash(signer, ens, contenthash)
}

// Verifies — before the build even starts — that the signer is actually
// allowed to update the name's records, across the auth mechanisms of the
// registry and the known PublicResolver generations. On failure it prints the
// exact one-time approval call the name owner needs to make.
async function preflightEns(signer: Signer, ensName: string) {
  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(signer.rpcUrl),
  })
  const signerAddress = getAddress(signer.account.address)

  const chainId = await publicClient.getChainId()
  if (
    chainId !== 1 &&
    !parseBoolEnv(process.env.PUBLISH_SITE_ALLOW_NON_MAINNET)
  ) {
    throw new Error(
      `Refusing to update ${ensName} on chain ${chainId}. Point PUBLISH_SITE_RPC_URL at mainnet, or set PUBLISH_SITE_ALLOW_NON_MAINNET=1 for a fork/test run.`,
    )
  }

  const node = namehash(ensName)
  const resolver = (await publicClient.readContract({
    address: ENS_REGISTRY,
    abi: ENS_REGISTRY_ABI,
    functionName: 'resolver',
    args: [node],
  })) as Address
  if (resolver === zeroAddress) {
    throw new Error(`${ensName} has no resolver set in the ENS registry`)
  }

  const owner = (await publicClient.readContract({
    address: ENS_REGISTRY,
    abi: ENS_REGISTRY_ABI,
    functionName: 'owner',
    args: [node],
  })) as Address

  const supportsContenthash = await publicClient
    .readContract({
      address: resolver,
      abi: RESOLVER_ABI,
      functionName: 'supportsInterface',
      args: [CONTENTHASH_INTERFACE_ID],
    })
    .catch(() => null)
  if (supportsContenthash === false) {
    throw new Error(`${resolver} does not report ENS contenthash support`)
  }

  // true / false, or null when the resolver doesn't implement the mechanism.
  const probe = async (
    functionName: 'authorisations' | 'isApprovedForAll' | 'isApprovedFor',
    args: readonly unknown[],
  ): Promise<boolean | null> => {
    try {
      const result = await publicClient.readContract({
        address: resolver,
        abi: RESOLVER_AUTH_ABI,
        functionName,
        args: args as never,
      })
      return result === true
    } catch {
      return null
    }
  }

  const registryOperator = (await publicClient
    .readContract({
      address: ENS_REGISTRY,
      abi: ENS_REGISTRY_ABI,
      functionName: 'isApprovedForAll',
      args: [owner, signerAddress],
    })
    .catch(() => false)) as boolean
  const nodeAuthorisation = await probe('authorisations', [
    node,
    owner,
    signerAddress,
  ])
  const resolverOperator = await probe('isApprovedForAll', [
    owner,
    signerAddress,
  ])
  const nodeDelegate = await probe('isApprovedFor', [
    owner,
    node,
    signerAddress,
  ])

  const authVia =
    owner === signerAddress
      ? 'name owner'
      : registryOperator
        ? 'registry operator'
        : nodeAuthorisation
          ? 'resolver authorisation'
          : resolverOperator
            ? 'resolver operator'
            : nodeDelegate
              ? 'resolver delegate'
              : null

  if (authVia === null) {
    // Suggest the narrowest mechanism this resolver supports.
    const suggestion =
      nodeAuthorisation !== null
        ? {
            call: `setAuthorisation(${node}, ${signerAddress}, true)`,
            calldata: encodeFunctionData({
              abi: RESOLVER_AUTH_ABI,
              functionName: 'setAuthorisation',
              args: [node, signerAddress, true],
            }),
          }
        : nodeDelegate !== null
          ? {
              call: `approve(${node}, ${signerAddress}, true)`,
              calldata: encodeFunctionData({
                abi: RESOLVER_AUTH_ABI,
                functionName: 'approve',
                args: [node, signerAddress, true],
              }),
            }
          : {
              call: `setApprovalForAll(${signerAddress}, true) on the ENS registry ${ENS_REGISTRY} (broad: covers every name owned by ${owner})`,
              calldata: encodeFunctionData({
                abi: ENS_REGISTRY_ABI,
                functionName: 'setApprovalForAll',
                args: [signerAddress, true],
              }),
            }
    throw new Error(
      [
        `Signer ${signerAddress} is not authorized to update records for ${ensName}.`,
        `The name is owned by ${owner}. From that account, authorize the signer once:`,
        `  contract  ${resolver}`,
        `  call      ${suggestion.call}`,
        `  calldata  ${suggestion.calldata}`,
      ].join('\n'),
    )
  }

  console.log(`Chain       ${chainId}`)
  console.log(`Signer      ${signerAddress} (${authVia})`)
  console.log(`Owner       ${owner}`)
  console.log(`Resolver    ${resolver}`)

  return { node, resolver }
}

async function loadSigner(): Promise<Signer> {
  const dappEnv = loadOptionalEnv(resolve(DAPP_DIR, '.env'))
  const rpcUrl =
    process.env.PUBLISH_SITE_RPC_URL ??
    dappEnv.NUXT_PUBLIC_MAINNET_ENS_RPC ??
    dappEnv.NUXT_PUBLIC_DEFAULT_RPC
  if (!rpcUrl) {
    throw new Error(
      'No mainnet RPC found. Set PUBLISH_SITE_RPC_URL or NUXT_PUBLIC_MAINNET_ENS_RPC in .env.',
    )
  }

  const rawKey = process.env[SIGNER_KEY_NAME] ?? (await loadKeyFromKeystore())
  const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as Hex
  return { account: privateKeyToAccount(privateKey), rpcUrl }
}

// Reads the signing key from the hardhat v3 keystore. Same format and
// primitives as @nomicfoundation/hardhat-keystore: scrypt master key,
// HMAC-SHA-256 integrity check, AES-GCM-SIV encrypted secrets.
async function loadKeyFromKeystore(): Promise<string> {
  const keystorePath = process.env.PUBLISH_SITE_KEYSTORE_PATH
    ? resolve(process.env.PUBLISH_SITE_KEYSTORE_PATH)
    : DEFAULT_KEYSTORE_PATH
  const secretName = process.env.PUBLISH_SITE_KEYSTORE_SECRET ?? SIGNER_KEY_NAME

  if (!existsSync(keystorePath)) {
    throw new Error(
      `Hardhat keystore not found: ${keystorePath}. Set ${SIGNER_KEY_NAME} for non-interactive runs.`,
    )
  }

  const keystore = JSON.parse(readFileSync(keystorePath, 'utf8')) as Keystore
  if (keystore.version !== KEYSTORE_VERSION) {
    throw new Error(
      `Unsupported keystore version in ${keystorePath}: ${keystore.version}`,
    )
  }
  if (!(secretName in keystore.secrets)) {
    throw new Error(`Secret ${secretName} not found in ${keystorePath}`)
  }

  const password = await promptHidden(`Keystore password for ${secretName}: `)
  return decryptKeystoreSecret(keystore, secretName, password)
}

function decryptKeystoreSecret(
  keystore: Keystore,
  secretName: string,
  password: string,
): string {
  const derivation = keystore.crypto.masterKeyDerivation
  const masterKey = scrypt(
    password.normalize(derivation.unicodeNormalizationForm),
    nobleHexToBytes(derivation.salt),
    {
      N: derivation.paramN,
      r: derivation.paramR,
      p: derivation.paramP,
      dkLen: derivation.keyLength / 8,
    },
  )

  let hmacKey: Uint8Array
  try {
    hmacKey = nobleHexToBytes(decryptUtf8(masterKey, keystore.hmacKey))
  } catch {
    throw new Error('Keystore decryption failed. Wrong password?')
  }
  const hmacPreImage = deterministicJsonStringify({
    ...keystore,
    hmac: undefined,
  })
  const expectedHmac = nobleBytesToHex(
    hmac(sha256, hmacKey, new TextEncoder().encode(hmacPreImage)),
  )
  if (expectedHmac !== keystore.hmac) {
    throw new Error('Keystore HMAC mismatch')
  }

  const dataEncryptionKey = nobleHexToBytes(
    decryptUtf8(masterKey, keystore.dataEncryptionKey),
  )
  return decryptUtf8(dataEncryptionKey, keystore.secrets[secretName])
}

function decryptUtf8(key: Uint8Array, data: EncryptedData): string {
  const plain = siv(key, nobleHexToBytes(data.iv)).decrypt(
    nobleHexToBytes(data.cypherText),
  )
  return new TextDecoder().decode(plain)
}

// Mirrors hardhat-keystore's deterministic serialization: object keys sorted
// ascending at every level, no arrays or nulls.
function deterministicJsonStringify(obj: unknown): string {
  return JSON.stringify(obj, function stableReplacer(_key, value) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'undefined'
    ) {
      return value
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('Unsupported type in deterministic JSON')
    }
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      sorted[key] = (value as Record<string, unknown>)[key]
    }
    return sorted
  })
}

async function promptHidden(question: string): Promise<string> {
  const { stdin, stderr } = process
  if (!stdin.isTTY) {
    throw new Error(
      `Keystore password needs a terminal. Set ${SIGNER_KEY_NAME} for non-interactive runs.`,
    )
  }

  stderr.write(question)
  stdin.setRawMode(true)
  stdin.resume()

  return await new Promise<string>((resolvePromise, reject) => {
    let value = ''
    const cleanup = () => {
      stdin.setRawMode(false)
      stdin.pause()
      stdin.off('data', onData)
      stderr.write('\n')
    }
    const onData = (chunk: Buffer) => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\r' || char === '\n') {
          cleanup()
          resolvePromise(value)
          return
        }
        if (char === '\u0003') {
          cleanup()
          reject(new Error('Aborted'))
          return
        }
        if (char === '\u007f' || char === '\b') {
          if (value.length > 0) {
            value = value.slice(0, -1)
            stderr.write('\b \b')
          }
          continue
        }
        value += char
        stderr.write('*')
      }
    }
    stdin.on('data', onData)
  })
}

async function generateStaticSite() {
  console.log(`Cleaning    ${relative(DAPP_DIR, OUTPUT_DIR)}`)
  await rm(resolve(DAPP_DIR, '.output'), { force: true, recursive: true })

  const env = {
    ...process.env,
    ...loadOptionalEnv(resolve(DAPP_DIR, '.env.production')),
    NODE_ENV: 'production',
  }
  // Never hand the signing key to the build's process tree.
  delete env[SIGNER_KEY_NAME]

  console.log('Generating  pnpm generate')
  await run('pnpm', ['generate'], DAPP_DIR, env)

  const output = await stat(OUTPUT_DIR).catch(() => null)
  if (!output?.isDirectory()) {
    throw new Error(`Nuxt did not write ${OUTPUT_DIR}`)
  }
}

async function uploadDirectory(
  env: IpfsEnv,
  baseDir: string,
  files: FileEntry[],
  mfsPath: string,
): Promise<string> {
  await ipfsFetch(env, 'files/rm', {
    arg: mfsPath,
    recursive: 'true',
  }).catch(() => undefined)

  let uploaded = 0
  for (const file of files) {
    const content = await readFile(file.path)
    const targetPath = posix.join(mfsPath, file.relativePath)
    const form = new FormData()
    form.append('file', new Blob([content]), basename(file.relativePath))

    await ipfsFetch(
      env,
      'files/write',
      {
        arg: targetPath,
        create: 'true',
        parents: 'true',
        truncate: 'true',
      },
      {
        body: form,
      },
    )

    uploaded += 1
    console.log(
      `  [${uploaded}/${files.length}] ${relative(baseDir, file.path)} -> ${targetPath}`,
    )
  }

  const result = await ipfsJson<FilesStatResponse>(env, 'files/stat', {
    arg: mfsPath,
  })
  const cid = extractCid(result)
  await ipfsJson(env, 'pin/add', { arg: cid })
  return cid
}

async function updateEnsContenthash(
  signer: Signer,
  ens: { node: Hex; resolver: Address },
  contenthash: Hex,
) {
  const { node, resolver } = ens
  const transport = http(signer.rpcUrl)
  const publicClient = createPublicClient({ chain: mainnet, transport })
  const wallet = createWalletClient({
    account: signer.account,
    chain: mainnet,
    transport,
  })

  const current = (await publicClient.readContract({
    address: resolver,
    abi: RESOLVER_ABI,
    functionName: 'contenthash',
    args: [node],
  })) as Hex

  if (current.toLowerCase() === contenthash.toLowerCase()) {
    console.log('ENS         contenthash already up to date')
    return
  }

  console.log(`Current     ${current}`)
  console.log('ENS         simulating setContenthash')
  const { request } = await publicClient.simulateContract({
    address: resolver,
    abi: RESOLVER_ABI,
    functionName: 'setContenthash',
    args: [node, contenthash],
    account: signer.account,
  })

  console.log('ENS         sending setContenthash')
  const txHash = await wallet.writeContract(request)
  console.log(`Tx          ${txHash}`)

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
  if (receipt.status !== 'success') {
    throw new Error(`setContenthash transaction reverted: ${txHash}`)
  }

  const updated = (await publicClient.readContract({
    address: resolver,
    abi: RESOLVER_ABI,
    functionName: 'contenthash',
    args: [node],
  })) as Hex
  if (updated.toLowerCase() !== contenthash.toLowerCase()) {
    throw new Error(`Resolver contenthash mismatch after tx: ${updated}`)
  }

  console.log(`Block       ${receipt.blockNumber}`)
  console.log('Done        ENS contenthash updated')
}

async function ipfsFetch(
  env: IpfsEnv,
  endpoint: string,
  params: Record<string, string>,
  init: RequestInit = {},
): Promise<Response> {
  const url = new URL(`/api/v0/${endpoint}`, `https://${env.adminHost}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const response = await fetch(url, {
    ...init,
    method: 'POST',
    headers: {
      authorization: basicAuth(env.user, env.password),
      ...init.headers,
    },
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(
      `IPFS ${endpoint} failed (${response.status} ${response.statusText}): ${body}`,
    )
  }
  return response
}

async function ipfsJson<T = unknown>(
  env: IpfsEnv,
  endpoint: string,
  params: Record<string, string>,
): Promise<T> {
  const response = await ipfsFetch(env, endpoint, params)
  return (await response.json()) as T
}

async function collectFiles(baseDir: string, rel = ''): Promise<FileEntry[]> {
  const entries = await readdir(join(baseDir, rel), { withFileTypes: true })
  entries.sort((a, b) => a.name.localeCompare(b.name))

  const files: FileEntry[] = []
  for (const entry of entries) {
    const relativePath = rel ? posix.join(rel, entry.name) : entry.name
    const fullPath = join(baseDir, relativePath)
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(baseDir, relativePath)))
    } else if (entry.isFile()) {
      const info = await stat(fullPath)
      files.push({ path: fullPath, relativePath, size: info.size })
    }
  }
  return files
}

async function run(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
) {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: 'inherit',
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise()
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with ${code}`))
      }
    })
  })
}

function encodeIpfsContenthash(cid: string): Hex {
  const cidBytes = cidToBytes(cid)
  return bytesToHex(
    new Uint8Array([...encodeVarint(IPFS_NS_CODEC), ...cidBytes]),
  )
}

function cidToBytes(cid: string): Uint8Array {
  if (cid.startsWith('Qm')) {
    return new Uint8Array([0x01, DAG_PB_CODEC, ...decodeBase58(cid)])
  }

  const prefix = cid[0]
  const encoded = cid.slice(1)
  let bytes: Uint8Array
  if (prefix === 'b' || prefix === 'B') {
    bytes = decodeBase32(encoded.toLowerCase())
  } else if (prefix === 'z') {
    bytes = decodeBase58(encoded)
  } else if (prefix === 'f' || prefix === 'F') {
    bytes = decodeBase16(encoded)
  } else {
    throw new Error(`Unsupported CID multibase prefix: ${prefix}`)
  }

  if (bytes[0] !== 0x01) {
    throw new Error(`Expected CIDv1 bytes for ${cid}`)
  }
  return bytes
}

function encodeVarint(value: number): number[] {
  const bytes: number[] = []
  let current = value
  while (current >= 0x80) {
    bytes.push((current & 0x7f) | 0x80)
    current >>= 7
  }
  bytes.push(current)
  return bytes
}

function decodeBase58(value: string): Uint8Array {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let number = 0n
  for (const char of value) {
    const index = alphabet.indexOf(char)
    if (index === -1) throw new Error(`Invalid base58 character: ${char}`)
    number = number * 58n + BigInt(index)
  }

  let hex = number.toString(16)
  if (hex.length % 2) hex = `0${hex}`
  const bytes = hex === '00' ? [] : decodeBase16(hex)
  const leadingZeroes = value.match(/^1*/)?.[0].length ?? 0
  return new Uint8Array([...new Array<number>(leadingZeroes).fill(0), ...bytes])
}

function decodeBase32(value: string): Uint8Array {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567'
  const out: number[] = []
  let bits = 0
  let buffer = 0

  for (const char of value.replace(/=+$/, '')) {
    const index = alphabet.indexOf(char)
    if (index === -1) throw new Error(`Invalid base32 character: ${char}`)
    buffer = (buffer << 5) | index
    bits += 5
    if (bits >= 8) {
      bits -= 8
      out.push((buffer >> bits) & 0xff)
      buffer &= (1 << bits) - 1
    }
  }

  return new Uint8Array(out)
}

function decodeBase16(value: string): Uint8Array {
  const normalized = value.length % 2 ? `0${value}` : value
  if (!/^[0-9a-fA-F]*$/.test(normalized)) {
    throw new Error('Invalid base16 input')
  }
  return new Uint8Array(
    normalized.match(/.{2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [],
  )
}

function extractCid(result: FilesStatResponse): string {
  if (typeof result.Hash === 'string') return result.Hash
  if (typeof result.Cid === 'string') return result.Cid
  if (typeof result.Cid?.['/'] === 'string') return result.Cid['/']
  throw new Error(
    `Could not read CID from files/stat response: ${JSON.stringify(result)}`,
  )
}

function loadIpfsEnv(envPath: string): IpfsEnv {
  if (!existsSync(envPath)) {
    throw new Error(`IPFS env file not found: ${envPath}`)
  }

  const values: EnvLike = {
    ...loadEnvFile(envPath),
    ...process.env,
  }
  const adminHost = stripProtocol(required(values, 'IPFS_ADMIN_HOST'))
  const gatewayHost = stripProtocol(values.IPFS_HOST ?? 'ipfs.io')
  return {
    adminHost,
    gatewayHost,
    user: values.ADMIN_USER ?? 'admin',
    password: required(values, 'ADMIN_PASSWORD'),
    envPath,
  }
}

function loadOptionalEnv(path: string): EnvMap {
  return existsSync(path) ? loadEnvFile(path) : {}
}

function loadEnvFile(path: string): EnvMap {
  const text = existsSync(path) ? readFileSync(path, 'utf8') : ''
  const values: EnvMap = {}
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/,
    )
    if (!match) continue

    const [, key, rawValue] = match
    if (!key || line.trimStart().startsWith('#')) continue
    values[key] = parseEnvValue(rawValue ?? '')
  }
  return values
}

function parseEnvValue(rawValue: string): string {
  const value = rawValue.trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    const unquoted = value.slice(1, -1)
    return value.startsWith('"')
      ? unquoted
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
      : unquoted
  }
  return value
}

function required(values: EnvLike, key: string): string {
  const value = values[key]
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

function stripProtocol(host: string): string {
  return host.replace(/^https?:\/\//, '').replace(/\/+$/, '')
}

function normalizeMfsPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return normalized.replace(/\/+$/, '') || '/'
}

function basicAuth(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`
}

async function logUpload(
  env: IpfsEnv,
  cid: string,
  mfsPath: string,
  sourcePath: string,
) {
  const logPath = resolve(dirname(env.envPath), 'uploads.log')
  const line = `${new Date().toISOString()}  ${cid}  ${mfsPath}  ${sourcePath}\n`
  await appendFile(logPath, line).catch(() => undefined)
}

function parseBoolEnv(value: string | undefined): boolean {
  if (!value) return false
  return ['1', 'true', 'yes', 'y'].includes(value.toLowerCase())
}

function formatTimestamp(date: Date): string {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/[-:]/g, '')
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
