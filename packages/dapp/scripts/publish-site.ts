#!/usr/bin/env node

// Publish the dapp to IPFS and print the CID for the ENS update.
//
// Runs `pnpm generate`, uploads .output/public to the self-hosted IPFS node
// (admin credentials from ~/1001/ipfs-server/.env.production, override with
// IPFS_ENV_PATH), and pins the result. The ENS contenthash is not touched;
// copy the printed CID / contenthash into the SAFE that owns the name.
//
// Overrides:
//   PUBLISH_SITE_ENS_NAME    ENS name used for the MFS directory (default evmnow.eth)
//   PUBLISH_SITE_MFS_PARENT  MFS directory on the IPFS node (default /<ens name>)
//   PUBLISH_SITE_TIMESTAMP   fixed timestamp for the MFS dist dir

import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { appendFile, readdir, readFile, rm, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, join, posix, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type Hex = `0x${string}`

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const DAPP_DIR = resolve(SCRIPT_DIR, '..')
const OUTPUT_DIR = resolve(DAPP_DIR, '.output', 'public')

const DEFAULT_IPFS_ENV_PATH = resolve(
  homedir(),
  '1001/ipfs-server/.env.production',
)

const IPFS_NS_CODEC = 0xe3
const DAG_PB_CODEC = 0x70

type EnvMap = Record<string, string>
type EnvLike = Record<string, string | undefined>

type IpfsEnv = {
  adminHost: string
  gatewayHost: string
  user: string
  password: string
  envPath: string
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

  await logUpload(ipfsEnv, cid, mfsPath, OUTPUT_DIR)

  console.log('')
  console.log(`CID         ${cid}`)
  console.log(`ipfs://     ipfs://${cid}`)
  console.log(`Contenthash ${contenthash}`)
  console.log(`Gateway     https://${ipfsEnv.gatewayHost}/ipfs/${cid}/`)
  console.log(`Preview     https://${toSubdomainCid(cid)}.ipfs.dweb.link/`)
  console.log('')
  console.log(
    `Update ${ensName} from the SAFE: set the contenthash above (or ipfs://${cid} in the ENS manager).`,
  )
}

async function generateStaticSite() {
  console.log(`Cleaning    ${relative(DAPP_DIR, OUTPUT_DIR)}`)
  await rm(resolve(DAPP_DIR, '.output'), { force: true, recursive: true })

  const env = {
    ...process.env,
    ...loadOptionalEnv(resolve(DAPP_DIR, '.env.production')),
    NODE_ENV: 'production',
  }

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

function bytesToHex(bytes: Uint8Array): Hex {
  let hex = ''
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0')
  }
  return `0x${hex}`
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

// Subdomain gateways need a case-insensitive CID, so anything that is not
// already base32 CIDv1 gets re-encoded.
function toSubdomainCid(cid: string): string {
  if (cid.startsWith('b')) return cid
  return `b${encodeBase32(cidToBytes(cid))}`
}

function encodeBase32(bytes: Uint8Array): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567'
  let out = ''
  let bits = 0
  let buffer = 0

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      out += alphabet[(buffer >> bits) & 0x1f]
      buffer &= (1 << bits) - 1
    }
  }
  if (bits > 0) {
    out += alphabet[(buffer << (5 - bits)) & 0x1f]
  }
  return out
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
