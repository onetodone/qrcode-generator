import { phone } from 'phone'
import * as z from 'zod'
import { randomToken } from '@/lib/random'

const HASH_LENGTH = 32

// General E.164 shape (ITU-T): "+" then 7-15 digits, no leading 0. Used as a
// fallback when the `phone` library can't map the input to a real numbering
// plan (e.g. placeholder/test numbers), so syntactically valid input isn't
// rejected just because it isn't a dialable number today.
const E164_PATTERN = /^\+[1-9]\d{6,14}$/

// A domain with an actual zone/TLD (.com, .th, .co.th, ...). Deliberately
// stricter than a bare `new URL()` check, which happily accepts non-domains
// like "asdf" or "blah@blah" (parsed as URL userinfo@host).
const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i

const emailSchema = z.email()

// Schemes we're willing to redirect a scanner to. `new URL()` alone accepts
// anything parseable, including `javascript:`/`data:`/`file:`, which would
// otherwise flow straight into the redirect at src/app/s/[hash]/route.ts.
const ALLOWED_URI_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:'])

/** Whether `value` is a URI with a scheme the redirect is allowed to target. */
export function isValidUri(value: string): boolean {
  try {
    return ALLOWED_URI_SCHEMES.has(new URL(value).protocol)
  } catch {
    return false
  }
}

function extractPhoneNumber(value: string): string | null {
  const strict = phone(value)
  if (strict.isValid) return strict.phoneNumber

  const compact = value.replace(/[\s().-]/g, '')
  return E164_PATTERN.test(compact) ? compact : null
}

function isValidEmail(value: string): boolean {
  return emailSchema.safeParse(value).success
}

function isLikelyDomain(value: string): boolean {
  const host = value.split(/[/?#]/, 1)[0] ?? ''
  return DOMAIN_PATTERN.test(host)
}

/**
 * Turns user input into a redirect target: a ready-made URI (https:, mailto:,
 * tel:, ...) as-is, otherwise a phone number, an email address, or a bare
 * domain with a real zone/TLD prefixed with `https://`. Returns null when none
 * of those apply.
 */
export function normalizeLeadsTo(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null

  if (isValidUri(value)) return value

  const phoneNumber = extractPhoneNumber(value)
  if (phoneNumber) return `tel:${phoneNumber}`

  if (isValidEmail(value)) return `mailto:${value}`

  if (isLikelyDomain(value)) {
    const withScheme = `https://${value}`
    if (isValidUri(withScheme)) return withScheme
  }

  return null
}

/**
 * Whether a destination carries a username or password. `https://bank.com@evil.example`
 * opens `evil.example` while reading like `bank.com`.
 */
export function hasUrlCredentials(leadsTo: string): boolean {
  try {
    const url = new URL(leadsTo)
    return url.username !== '' || url.password !== ''
  } catch {
    return false
  }
}

/** Whether a destination is a `/s/<hash>` link on one of `appHostnames`, i.e. another code's tracking link. */
export function isOwnRedirectLink(leadsTo: string, appHostnames: string[]): boolean {
  try {
    const url = new URL(leadsTo)
    return appHostnames.includes(url.hostname) && url.pathname.startsWith('/s/')
  } catch {
    return false
  }
}

/** Random hash for the `/s/<hash>` redirect link. */
export function generateUrlHash(): string {
  return randomToken(HASH_LENGTH)
}
