import { encode } from 'next-auth/jwt'

/** Name of the session cookie over plain HTTP, also the JWT salt. */
export const SESSION_COOKIE = 'authjs.session-token'

type StoredCookie = { name: string; value: string; options?: Record<string, unknown> }

/**
 * The incoming request that `next/headers` reports to the code under test:
 * client IP, extra headers, and a cookie jar that `cookies().set()` writes to,
 * as a browser would keep it for the next request.
 */
const state = {
  ip: '203.0.113.10',
  headers: {} as Record<string, string>,
  cookies: new Map<string, StoredCookie>(),
}

/** Starts a fresh browser: no cookies, the default IP. */
export function resetRequest(): void {
  state.ip = '203.0.113.10'
  state.headers = {}
  state.cookies.clear()
}

/** Makes the following calls come from `ip`. */
export function setClientIp(ip: string): void {
  state.ip = ip
}

/** Adds a header to the following calls. */
export function setRequestHeader(name: string, value: string): void {
  state.headers[name.toLowerCase()] = value
}

/** The cookie's value in the jar, or `undefined`. */
export function getCookie(name: string): string | undefined {
  return state.cookies.get(name)?.value
}

/** Puts a cookie in the jar. */
export function setCookie(name: string, value: string): void {
  state.cookies.set(name, { name, value })
}

/** Removes every cookie, as a browser that never signed in. */
export function clearCookies(): void {
  state.cookies.clear()
}

/** Snapshot of the jar, to switch between two browsers. */
export function saveCookies(): Map<string, StoredCookie> {
  return new Map(state.cookies)
}

/** Restores a jar taken with `saveCookies`. */
export function restoreCookies(jar: Map<string, StoredCookie>): void {
  state.cookies = new Map(jar)
}

function cookieHeader(): string {
  return [...state.cookies.values()].map(({ name, value }) => `${name}=${value}`).join('; ')
}

/** Request headers of the current call, as `headers()` returns them. */
export function requestHeaders(): Headers {
  const result = new Headers({
    host: 'localhost:3000',
    'x-forwarded-proto': 'http',
    'x-forwarded-for': state.ip,
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
    ...state.headers,
  })
  const cookie = cookieHeader()
  if (cookie) result.set('cookie', cookie)
  return result
}

function isExpired(options: Record<string, unknown> | undefined): boolean {
  if (!options) return false
  if (typeof options.maxAge === 'number' && options.maxAge <= 0) return true
  const expires = options.expires
  return expires instanceof Date && expires.getTime() <= Date.now()
}

/** The `cookies()` store over the jar. */
export function cookieStore() {
  return {
    get: (name: string) => state.cookies.get(name),
    getAll: () => [...state.cookies.values()],
    has: (name: string) => state.cookies.has(name),
    set: (nameOrCookie: string | StoredCookie, value = '', options?: Record<string, unknown>) => {
      const cookie: StoredCookie =
        typeof nameOrCookie === 'string'
          ? { name: nameOrCookie, value, options }
          : { name: nameOrCookie.name, value: nameOrCookie.value, options: nameOrCookie }
      if (!cookie.value || isExpired(cookie.options)) state.cookies.delete(cookie.name)
      else state.cookies.set(cookie.name, cookie)
    },
    delete: (name: string) => state.cookies.delete(name),
  }
}

/**
 * Signs this browser in as `userId` with a session token like the one the
 * `jwt` callback issues. `signedInAt` and `checkedAt` default to now.
 */
export async function signInAs(
  userId: string,
  { passwordChangedAt = 0, signedInAt = Date.now(), checkedAt = Date.now() } = {},
): Promise<string> {
  const token = await encode({
    token: { sub: userId, id: userId, passwordChangedAt, signedInAt, checkedAt },
    secret: process.env.AUTH_SECRET ?? '',
    salt: SESSION_COOKIE,
  })
  setCookie(SESSION_COOKIE, token)
  return token
}
