import { afterEach, describe, expect, test, vi } from 'vitest'
import { loginAction } from '@/actions/auth'
import { prisma } from '@/lib/prisma'
import { createUser, PASSWORD } from './helpers/db'
import { emailsOf } from './helpers/mailer'
import { form, redirectOf } from './helpers/navigation'
import { getCookie, SESSION_COOKIE, setClientIp } from './helpers/request'

function login(email: string, password: string, extra: Record<string, string> = {}) {
  return loginAction(undefined, form({ email, password, ...extra }))
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('sign-in with a password', () => {
  test('signs a confirmed account in and goes to /qrcodes', async () => {
    const user = await createUser()
    expect(await redirectOf(login(user.email, PASSWORD))).toBe('http://localhost:3000/qrcodes')
    expect(getCookie(SESSION_COOKIE)).toBeTruthy()
  })

  test('accepts the address in another letter case', async () => {
    await createUser({ email: 'mixed@example.com' })
    expect(await redirectOf(login('  MIXED@Example.com ', PASSWORD))).toContain('/qrcodes')
  })

  test('gives one answer for a wrong password and an unknown account', async () => {
    const user = await createUser()
    const wrongPassword = await login(user.email, 'wrong password')
    const unknownAccount = await login('nobody@example.com', PASSWORD)
    expect(wrongPassword).toEqual({ error: 'Invalid email or password.', captchaRequired: false })
    expect(unknownAccount).toEqual(wrongPassword)
    expect(getCookie(SESSION_COOKIE)).toBeUndefined()
  })

  test('refuses an account without a password', async () => {
    const user = await createUser({ password: null })
    expect((await login(user.email, PASSWORD))?.error).toBe('Invalid email or password.')
  })

  test('sends an unconfirmed account a fresh link and goes to /verify-email', async () => {
    const user = await createUser({ emailVerified: null })
    expect(await redirectOf(login(user.email, PASSWORD))).toBe('/verify-email')
    expect(emailsOf('verifyEmail', user.email)).toHaveLength(1)
    expect(getCookie('pending-email')).toBe(user.email)
    expect(getCookie(SESSION_COOKIE)).toBeUndefined()
  })

  test('refuses a suspended account', async () => {
    const user = await createUser({ suspendedAt: new Date() })
    expect((await login(user.email, PASSWORD))?.error).toBe(
      'This account has been suspended. Contact support@example.com.',
    )
    expect(getCookie(SESSION_COOKIE)).toBeUndefined()
  })
})

describe('sign-in limits', () => {
  test('blocks an IP after 10 failed attempts, even with the right password', async () => {
    const user = await createUser()
    for (let i = 0; i < 10; i++) {
      expect((await login(`other${i}@example.com`, 'wrong'))?.error).toBe('Invalid email or password.')
    }
    expect((await login(user.email, PASSWORD))?.error).toMatch(/^Too many attempts/)

    setClientIp('198.51.100.7')
    expect(await redirectOf(login(user.email, PASSWORD))).toContain('/qrcodes')
  })

  test('blocks an account after 10 failed attempts from any IPs', async () => {
    const user = await createUser()
    for (let i = 0; i < 10; i++) {
      setClientIp(`198.51.100.${i + 1}`)
      await login(user.email, 'wrong')
    }
    setClientIp('192.0.2.200')
    expect((await login(user.email, PASSWORD))?.error).toMatch(/^Too many attempts/)
  })

  test('doesn’t count sign-ins with the right password', async () => {
    const user = await createUser()
    for (let i = 0; i < 12; i++) {
      await redirectOf(login(user.email, PASSWORD))
    }
    expect(await redirectOf(login(user.email, PASSWORD))).toContain('/qrcodes')
  })

  test('asks for the Turnstile check after 3 failures when it is on', async () => {
    vi.stubEnv('TURNSTILE_SITE_KEY', 'site-key')
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret-key')
    const siteverify = vi.fn(async () => Response.json({ success: true, action: 'login' }))
    vi.stubGlobal('fetch', siteverify)
    const user = await createUser()

    expect((await login(user.email, 'wrong'))?.captchaRequired).toBe(false)
    await login(user.email, 'wrong')
    expect((await login(user.email, 'wrong'))?.captchaRequired).toBe(true)

    expect(await login(user.email, PASSWORD)).toEqual({
      error: 'Please complete the verification and try again.',
      captchaRequired: true,
    })
    expect(siteverify).not.toHaveBeenCalled()

    expect(await redirectOf(login(user.email, PASSWORD, { 'cf-turnstile-response': 'token' }))).toContain('/qrcodes')
    expect(siteverify).toHaveBeenCalledOnce()
  })
})

describe('session', () => {
  test('ends at the next check once the account is suspended', async () => {
    const user = await createUser()
    await redirectOf(login(user.email, PASSWORD))
    const { auth } = await import('@/auth')
    expect((await auth())?.user?.id).toBe(user.id)

    await prisma.user.update({ where: { id: user.id }, data: { suspendedAt: new Date() } })
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 31_000)
    try {
      expect(await auth()).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})
