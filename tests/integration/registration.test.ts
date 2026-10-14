import { describe, expect, test, vi } from 'vitest'
import { confirmEmailAction, registerAction, resendVerificationEmailAction } from '@/actions/auth'
import { prisma } from '@/lib/prisma'
import { createToken, createUser } from './helpers/db'
import { flushAfter } from './helpers/after'
import { emailsOf, failNextEmails, sentEmails, tokenFromEmail } from './helpers/mailer'
import { form, redirectOf } from './helpers/navigation'
import { getCookie, SESSION_COOKIE, setClientIp } from './helpers/request'

const NEW_PASSWORD = 'new password 123'

function register(email: string, name = 'Ann') {
  return registerAction(undefined, form({ name, email, acceptTerms: 'on' }))
}

function confirmAccount(token: string, password = NEW_PASSWORD) {
  return confirmEmailAction(undefined, form({ token, newPassword: password, confirmPassword: password }))
}

describe('registration', () => {
  test('creates an unconfirmed account, emails the link and goes to /verify-email', async () => {
    expect(await redirectOf(register('New@Example.com'))).toBe('/verify-email')

    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'new@example.com' } })
    expect(user).toMatchObject({ name: 'Ann', emailVerified: null, password: null })
    expect(user.termsAcceptedAt).not.toBeNull()
    expect(emailsOf('verifyEmail', 'new@example.com')).toHaveLength(1)
    expect(getCookie('pending-email')).toBe('new@example.com')
  })

  test('tells a confirmed account that it exists instead, with the same answer', async () => {
    const user = await createUser()
    expect(await redirectOf(register(user.email.toUpperCase(), 'Mallory'))).toBe('/verify-email')
    expect(sentEmails.map((email) => email.template)).toEqual(['accountExists'])
    expect(await prisma.user.count()).toBe(1)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).name).toBe(user.name)
  })

  test('sends an unconfirmed account a new link that replaces the old one', async () => {
    await redirectOf(register('pending@example.com'))
    const first = tokenFromEmail(emailsOf('verifyEmail')[0])

    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 3 * 60_000)
    try {
      expect(await redirectOf(register('pending@example.com', 'Ann Lee'))).toBe('/verify-email')
    } finally {
      vi.useRealTimers()
    }

    const second = tokenFromEmail(emailsOf('verifyEmail')[1])
    expect(second).not.toBe(first)
    expect(await prisma.verificationToken.findMany({ select: { token: true } })).toEqual([{ token: second }])
    expect(await prisma.user.findMany({ select: { name: true } })).toEqual([{ name: 'Ann Lee' }])
  })

  test('limits registrations per address and per IP', async () => {
    await redirectOf(register('limit@example.com'))
    setClientIp('198.51.100.2')
    expect((await register('LIMIT@example.com'))?.error).toMatch(/^Too many attempts/)

    setClientIp('198.51.100.3')
    for (let i = 0; i < 5; i++) await redirectOf(register(`ip${i}@example.com`))
    expect((await register('ip5@example.com'))?.error).toMatch(/^Too many attempts/)
  })

  test('removes the account again when the email can’t be sent', async () => {
    failNextEmails()
    expect(await register('unlucky@example.com')).toEqual({
      error: "We couldn't send the email. Please try again in a few minutes.",
    })
    expect(await prisma.user.count()).toBe(0)
    expect(await prisma.verificationToken.count()).toBe(0)

    expect(await redirectOf(register('unlucky@example.com'))).toBe('/verify-email')
  })

  test('rejects invalid input before anything is stored', async () => {
    expect(await registerAction(undefined, form({ name: 'Ann', email: 'a@example.com' }))).toEqual({
      error: 'Please agree to the Terms of Use to create an account.',
    })
    expect((await register('not-an-email'))?.error).toBe('Please enter a valid email address.')
    expect(await prisma.user.count()).toBe(0)
  })
})

describe('account confirmation', () => {
  test('sets the chosen password, confirms the address and signs in', async () => {
    await redirectOf(register('confirm@example.com'))
    const token = tokenFromEmail(emailsOf('verifyEmail')[0])

    expect(await redirectOf(confirmAccount(token))).toBe('http://localhost:3000/qrcodes')
    expect(getCookie(SESSION_COOKIE)).toBeTruthy()

    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'confirm@example.com' } })
    expect(user.emailVerified).not.toBeNull()
    expect(user.password).toMatch(/^\$2/)
    expect(await prisma.verificationToken.count()).toBe(0)
  })

  test('works once', async () => {
    await redirectOf(register('once@example.com'))
    const token = tokenFromEmail(emailsOf('verifyEmail')[0])
    await redirectOf(confirmAccount(token))

    expect(await redirectOf(confirmAccount(token, 'another password'))).toBe('/confirm-email')
  })

  test('refuses an expired token', async () => {
    const user = await createUser({ emailVerified: null, password: null })
    const { token } = await createToken(user.email, 'EMAIL_VERIFY', { expires: new Date(Date.now() - 1000) })
    expect(await redirectOf(confirmAccount(token))).toBe('/confirm-email')
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerified).toBeNull()
  })

  test('refuses a password reset or email change token', async () => {
    const user = await createUser({ emailVerified: null, password: null })
    for (const type of ['PASSWORD_RESET', 'EMAIL_CHANGE'] as const) {
      const { token } = await createToken(user.email, type)
      expect(await redirectOf(confirmAccount(token))).toBe('/confirm-email')
    }
    expect(getCookie(SESSION_COOKIE)).toBeUndefined()
  })

  test('refuses a token for an account that is already confirmed', async () => {
    const user = await createUser()
    const { token } = await createToken(user.email, 'EMAIL_VERIFY')
    expect(await redirectOf(confirmAccount(token))).toBe('/confirm-email')
    expect(getCookie(SESSION_COOKIE)).toBeUndefined()
  })

  test('checks the password before using up the token', async () => {
    const user = await createUser({ emailVerified: null, password: null })
    const { token } = await createToken(user.email, 'EMAIL_VERIFY')
    expect(await confirmAccount(token, 'short')).toEqual({ error: 'Password must be at least 8 characters.' })
    expect(await redirectOf(confirmAccount(token))).toContain('/qrcodes')
  })
})

describe('resending the confirmation link', () => {
  test('gives every address the same answer and emails only unconfirmed accounts', async () => {
    const unconfirmed = await createUser({ emailVerified: null })
    const confirmed = await createUser()

    for (const email of [unconfirmed.email, confirmed.email, 'nobody@example.com']) {
      expect(await resendVerificationEmailAction(undefined, form({ email }))).toEqual({ success: true })
    }
    await flushAfter()
    expect(sentEmails.map((email) => [email.template, email.to])).toEqual([['verifyEmail', unconfirmed.email]])
  })

  test('sends a pending email change its link again', async () => {
    const user = await createUser({ pendingEmail: 'next@example.com' })
    await resendVerificationEmailAction(undefined, form({ email: 'next@example.com' }))
    await flushAfter()
    expect(emailsOf('verifyEmailChange', 'next@example.com')).toHaveLength(1)
    expect(user.email).not.toBe('next@example.com')
  })

  test('waits 2 minutes between links to one address', async () => {
    const user = await createUser({ emailVerified: null })
    await resendVerificationEmailAction(undefined, form({ email: user.email }))
    await resendVerificationEmailAction(undefined, form({ email: user.email }))
    await flushAfter()
    expect(emailsOf('verifyEmail')).toHaveLength(1)
  })
})
