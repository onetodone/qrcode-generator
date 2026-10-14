import { getURLFromRedirectError } from 'next/dist/client/components/redirect'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { isHTTPAccessFallbackError } from 'next/dist/client/components/http-access-fallback/http-access-fallback'

/** Awaits `promise` and returns the path that its `redirect()` pointed to; fails when it doesn't redirect. */
export async function redirectOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise
  } catch (error) {
    if (isRedirectError(error)) return getURLFromRedirectError(error) ?? ''
    throw error
  }
  throw new Error('Expected a redirect')
}

/** Awaits `promise` and reports whether it ended with `notFound()`. */
export async function isNotFound(promise: Promise<unknown>): Promise<boolean> {
  try {
    await promise
    return false
  } catch (error) {
    if (isHTTPAccessFallbackError(error)) return true
    throw error
  }
}

/** Form data from plain fields. */
export function form(fields: Record<string, string>): FormData {
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) data.set(name, value)
  return data
}
