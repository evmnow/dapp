type ErrorRecord = Record<string, unknown> & { cause?: unknown }

function collectErrorRecords(
  value: unknown,
  seen = new Set<unknown>(),
): ErrorRecord[] {
  if (!value || typeof value !== 'object' || seen.has(value)) return []
  seen.add(value)

  const record = value as ErrorRecord
  const records = [record]

  if (record.cause) {
    records.push(...collectErrorRecords(record.cause, seen))
  }

  return records
}

function collectErrorText(records: ErrorRecord[]): string[] {
  const parts: string[] = []

  for (const record of records) {
    for (const key of [
      'shortMessage',
      'message',
      'details',
      'reason',
      'name',
    ]) {
      const entry = record[key]
      if (typeof entry === 'string' && entry.trim()) {
        parts.push(entry)
      }
    }

    const metaMessages = record.metaMessages
    if (Array.isArray(metaMessages)) {
      for (const entry of metaMessages) {
        if (typeof entry === 'string' && entry.trim()) {
          parts.push(entry)
        }
      }
    }
  }

  return parts
}

function isKnownZeroDataReadFailure(records: ErrorRecord[]): boolean {
  return records.some((record) => {
    const name = typeof record.name === 'string' ? record.name : ''
    return (
      name === 'ContractFunctionZeroDataError' ||
      name === 'AbiDecodingZeroDataError'
    )
  })
}

export function normalizeReadError(
  error: unknown,
  options: { functionName?: string; fallback?: string } = {},
): string {
  const fallback = options.fallback || 'Read failed'
  const records = collectErrorRecords(error)
  const texts = collectErrorText(records)
  const primary = texts.find(Boolean) || ''

  if (isKnownZeroDataReadFailure(records)) {
    const functionName = options.functionName?.trim()

    if (functionName) {
      return `No data was returned for ${functionName}(). This function may not be callable on this contract address.`
    }

    return 'No data was returned for this read call. This function may not be callable on this contract address.'
  }

  return primary || fallback
}
