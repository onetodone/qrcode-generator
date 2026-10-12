const SESSION_COOKIE_NAMES = ['__Secure-authjs.session-token', 'authjs.session-token']
const CHUNK_SUFFIX = /^\.(0|[1-9]\d*)$/
// A JWE in compact serialization: base64url segments joined by dots.
const TOKEN_VALUE = /^[\w.-]+$/

/**
 * The session cookie found in a `Cookie` header: `none` without one, `invalid`
 * when Auth.js might read it differently, otherwise the cookie name (the JWT
 * salt) and the token joined from its chunks.
 */
export type SessionCookie = 'none' | 'invalid' | { name: string; value: string }

// Auth.js trims only spaces and tabs around names and values.
function trimSpacesAndTabs(text: string): string {
  return text.replace(/^[ \t]+|[ \t]+$/g, '')
}

/**
 * Reads the session cookie from a raw `Cookie` header the way Auth.js does,
 * which joins every cookie whose name starts with the session cookie's name
 * and keeps the first of repeated names. Anything that could make it see a
 * different session, or none, is `invalid`: a prefixed name that isn't the
 * name or a numbered chunk of it, a repeated name, both the secure and the
 * plain name, chunks with gaps, or a value that isn't a token.
 */
export function readSessionCookie(header: string | null): SessionCookie {
  const seen = new Set<string>()
  const chunks: { name: string; index: number; value: string }[] = []

  for (const pair of (header ?? '').split(';')) {
    const separator = pair.indexOf('=')
    if (separator === -1) continue
    const cookieName = trimSpacesAndTabs(pair.slice(0, separator))
    const name = SESSION_COOKIE_NAMES.find((prefix) => cookieName.startsWith(prefix))
    if (!name) continue

    if (seen.has(cookieName)) return 'invalid'
    seen.add(cookieName)

    const value = trimSpacesAndTabs(pair.slice(separator + 1))
    if (!value) continue
    if (!TOKEN_VALUE.test(value)) return 'invalid'

    const suffix = cookieName.slice(name.length)
    if (suffix === '') {
      chunks.push({ name, index: -1, value })
      continue
    }
    const chunk = CHUNK_SUFFIX.exec(suffix)
    if (!chunk?.[1]) return 'invalid'
    chunks.push({ name, index: Number(chunk[1]), value })
  }

  const name = chunks[0]?.name
  if (!name) return 'none'
  if (chunks.some((chunk) => chunk.name !== name)) return 'invalid'

  if (chunks.some((chunk) => chunk.index === -1)) {
    return chunks.length === 1 && chunks[0] ? { name, value: chunks[0].value } : 'invalid'
  }
  chunks.sort((a, b) => a.index - b.index)
  if (chunks.some((chunk, position) => chunk.index !== position)) return 'invalid'
  return { name, value: chunks.map((chunk) => chunk.value).join('') }
}
