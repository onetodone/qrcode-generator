import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { captchaErrorMessage, getCaptchaSiteKey, isCaptchaEnabled, verifyCaptcha } from '@/lib/captcha'

const fetchMock = vi.fn<typeof fetch>()

function siteverify(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

beforeEach(() => {
  vi.stubEnv('TURNSTILE_SITE_KEY', 'site-key')
  vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret-key')
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

describe('captcha configuration', () => {
  test('is on only with both keys', () => {
    expect(isCaptchaEnabled()).toBe(true)
    expect(getCaptchaSiteKey()).toBe('site-key')
    vi.stubEnv('TURNSTILE_SECRET_KEY', ' ')
    expect(isCaptchaEnabled()).toBe(false)
    expect(getCaptchaSiteKey()).toBeNull()
  })
})

describe('verifyCaptcha', () => {
  test('passes everything when the check is off', async () => {
    vi.stubEnv('TURNSTILE_SITE_KEY', '')
    expect(await verifyCaptcha(undefined, 'login', '1.2.3.4')).toBe('ok')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test.each([undefined, '', 'x'.repeat(2049), 42])('fails a missing or malformed token %#', async (token) => {
    expect(await verifyCaptcha(token, 'login', '1.2.3.4')).toBe('failed')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('sends the secret, the token and a known IP', async () => {
    fetchMock.mockImplementation(async () => siteverify({ success: true, action: 'register' }))
    expect(await verifyCaptcha('token', 'register', '1.2.3.4')).toBe('ok')
    const body = fetchMock.mock.calls[0]?.[1]?.body as URLSearchParams
    expect(Object.fromEntries(body)).toEqual({ secret: 'secret-key', response: 'token', remoteip: '1.2.3.4' })

    expect(await verifyCaptcha('token', 'register', 'unknown')).toBe('ok')
    expect((fetchMock.mock.calls[1]?.[1]?.body as URLSearchParams).has('remoteip')).toBe(false)
  })

  test('fails a token issued for another form', async () => {
    fetchMock.mockResolvedValue(siteverify({ success: true, action: 'register' }))
    expect(await verifyCaptcha('token', 'login', '1.2.3.4')).toBe('failed')
  })

  test('accepts the testing keys, which answer without an action', async () => {
    fetchMock.mockResolvedValue(siteverify({ success: true, metadata: { result_with_testing_key: true } }))
    expect(await verifyCaptcha('token', 'login', '1.2.3.4')).toBe('ok')
  })

  test('fails a rejected token', async () => {
    fetchMock.mockResolvedValue(siteverify({ success: false, 'error-codes': ['invalid-input-response'] }))
    expect(await verifyCaptcha('token', 'login', '1.2.3.4')).toBe('failed')
  })

  test('is unavailable when Turnstile errs or can’t be reached', async () => {
    fetchMock.mockResolvedValueOnce(siteverify({}, 500))
    expect(await verifyCaptcha('token', 'login', '1.2.3.4')).toBe('unavailable')
    fetchMock.mockRejectedValueOnce(new Error('timeout'))
    expect(await verifyCaptcha('token', 'login', '1.2.3.4')).toBe('unavailable')
  })
})

describe('captchaErrorMessage', () => {
  test('tells an outage apart from a failed check', () => {
    expect(captchaErrorMessage('failed')).toBe('Please complete the verification and try again.')
    expect(captchaErrorMessage('unavailable')).toContain('try again in a few minutes')
  })
})
