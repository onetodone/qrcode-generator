import { logger } from '@/lib/logger'

const SEARCH_URLS_ENDPOINT = 'https://safebrowsing.googleapis.com/v5/urls:search'
const TIMEOUT_MS = 3_000

const THREAT_TYPE_NAMES: Record<number, string> = {
  1: 'MALWARE',
  2: 'SOCIAL_ENGINEERING',
  3: 'UNWANTED_SOFTWARE',
  4: 'POTENTIALLY_HARMFUL_APPLICATION',
}

/** Safe Browsing verdict for one URL. `unknown` when the lookup was skipped or failed. */
export type UrlVerdict = { status: 'safe' } | { status: 'unsafe'; threatTypes: string[] } | { status: 'unknown' }

function apiKey(): string | undefined {
  return process.env.SAFE_BROWSING_API_KEY?.trim() || undefined
}

/** Whether `SAFE_BROWSING_API_KEY` is set, i.e. whether destinations are checked at all. */
export function isSafeBrowsingEnabled(): boolean {
  return apiKey() !== undefined
}

type ProtoReader = { bytes: Uint8Array; pos: number }
type ProtoField = { field: number; value: number | Uint8Array }

function readVarint(reader: ProtoReader): number {
  let value = 0
  for (let shift = 0; shift < 64; shift += 7) {
    const byte = reader.bytes[reader.pos++]
    if (byte === undefined) throw new Error('Truncated protobuf varint')
    value += (byte & 0x7f) * 2 ** shift
    if (byte < 0x80) return value
  }
  throw new Error('Malformed protobuf varint')
}

function readFields(bytes: Uint8Array): ProtoField[] {
  const reader: ProtoReader = { bytes, pos: 0 }
  const fields: ProtoField[] = []
  while (reader.pos < bytes.length) {
    const tag = readVarint(reader)
    const field = Math.floor(tag / 8)
    const wireType = tag % 8
    if (wireType === 0) {
      fields.push({ field, value: readVarint(reader) })
    } else if (wireType === 2) {
      const end = readVarint(reader) + reader.pos
      if (end > bytes.length) throw new Error('Truncated protobuf field')
      fields.push({ field, value: bytes.subarray(reader.pos, end) })
      reader.pos = end
    } else if (wireType === 1 || wireType === 5) {
      reader.pos += wireType === 1 ? 8 : 4
    } else {
      throw new Error(`Unsupported protobuf wire type ${wireType}`)
    }
  }
  if (reader.pos > bytes.length) throw new Error('Truncated protobuf field')
  return fields
}

function readPackedVarints(bytes: Uint8Array): number[] {
  const reader: ProtoReader = { bytes, pos: 0 }
  const values: number[] = []
  while (reader.pos < bytes.length) values.push(readVarint(reader))
  return values
}

// urls:search answers in binary protobuf only (`$alt=json` is rejected with
// "Unsupported Output Format"). The response is small enough to decode by hand:
// SearchUrlsResponse { repeated ThreatUrl threats = 1 }, ThreatUrl { string url = 1;
// repeated ThreatType threat_types = 2 }. Returns null when nothing matched.
function decodeThreatTypes(body: Uint8Array): string[] | null {
  const threats = readFields(body).flatMap(({ field, value }) =>
    field === 1 && typeof value !== 'number' ? [value] : [],
  )
  if (threats.length === 0) return null

  const threatTypes = new Set<string>()
  for (const threat of threats) {
    for (const { field, value } of readFields(threat)) {
      if (field !== 2) continue
      const codes = typeof value === 'number' ? [value] : readPackedVarints(value)
      for (const code of codes) threatTypes.add(THREAT_TYPE_NAMES[code] ?? `THREAT_TYPE_${code}`)
    }
  }
  return [...threatTypes]
}

/**
 * Looks `url` up in Google Safe Browsing (v5 `urls:search`). Gives `unknown`
 * without an API key, on HTTP errors, timeouts and malformed responses, so the
 * caller decides what an unchecked URL means.
 */
export async function lookupUrl(url: string): Promise<UrlVerdict> {
  const key = apiKey()
  if (!key) return { status: 'unknown' }

  try {
    const response = await fetch(`${SEARCH_URLS_ENDPOINT}?${new URLSearchParams({ urls: url })}`, {
      headers: { 'X-Goog-Api-Key': key },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) {
      // Errors are a binary google.rpc.Status as well; its message strings stay readable.
      const body = (await response.text())
        .replace(/[^\x20-\x7e]+/g, ' ')
        .trim()
        .slice(0, 300)
      logger.warn('safe_browsing.lookup_failed', { status: response.status, body })
      return { status: 'unknown' }
    }

    const threatTypes = decodeThreatTypes(new Uint8Array(await response.arrayBuffer()))
    return threatTypes ? { status: 'unsafe', threatTypes } : { status: 'safe' }
  } catch (error) {
    logger.warn('safe_browsing.lookup_failed', { error })
    return { status: 'unknown' }
  }
}
