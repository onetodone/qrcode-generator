import { logger } from '@/lib/logger'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TIMEOUT_MS = 5_000
const MAX_TOKEN_LENGTH = 2048

/** Origin of the Turnstile script and challenge frame, for the CSP. */
export const CAPTCHA_ORIGIN = 'https://challenges.cloudflare.com'

/** Form field the Turnstile widget puts its token in. */
export const CAPTCHA_FIELD = 'cf-turnstile-response'

/** Form a token is issued for; a token from one form is rejected by another. */
export type CaptchaAction = 'register' | 'forgot-password' | 'login'

/** Outcome of a check: passed, rejected by Turnstile, or Turnstile couldn't be reached. */
export type CaptchaResult = 'ok' | 'failed' | 'unavailable'

function keys(): { siteKey: string; secretKey: string } | null {
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim()
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim()
  return siteKey && secretKey ? { siteKey, secretKey } : null
}

/** Whether `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` are both set, i.e. whether forms ask for a check. */
export function isCaptchaEnabled(): boolean {
  return keys() !== null
}

/** Public site key for the widget, or `null` when the check is off. */
export function getCaptchaSiteKey(): string | null {
  return keys()?.siteKey ?? null
}

/**
 * Checks a Turnstile token from `formData`/credentials with Cloudflare's
 * `siteverify`. Always `ok` when the check is off.
 */
export async function verifyCaptcha(token: unknown, action: CaptchaAction, ip: string): Promise<CaptchaResult> {
  const config = keys()
  if (!config) return 'ok'
  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) return 'failed'

  const body = new URLSearchParams({ secret: config.secretKey, response: token })
  if (ip !== 'unknown') body.set('remoteip', ip)

  try {
    const response = await fetch(SITEVERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!response.ok) throw new Error(`siteverify answered ${response.status}`)
    const result = (await response.json()) as {
      success?: boolean
      action?: string
      'error-codes'?: string[]
      metadata?: { result_with_testing_key?: boolean }
    }
    // Cloudflare's testing keys answer without the token's action.
    const actionMatches = result.action === action || result.metadata?.result_with_testing_key === true
    if (result.success && actionMatches) return 'ok'
    logger.warn('captcha.rejected', { action, receivedAction: result.action, errorCodes: result['error-codes'] })
    return 'failed'
  } catch (error) {
    logger.error('captcha.verify_failed', { error })
    return 'unavailable'
  }
}

/** User-facing message for a check that didn't pass. */
export function captchaErrorMessage(result: Exclude<CaptchaResult, 'ok'>): string {
  return result === 'unavailable'
    ? "We couldn't verify that you're human. Please try again in a few minutes."
    : 'Please complete the verification and try again.'
}
