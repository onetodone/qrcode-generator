import { describe, expect, test, vi } from 'vitest'
import { updateProfileAction } from '@/actions/profile'
import { confirmEmailAction } from '@/actions/auth'
import { prisma } from '@/lib/prisma'
import { createUser, PASSWORD } from './helpers/db'
import { flushAfter } from './helpers/after'
import { emailsOf, failNextEmails, sentEmails, tokenFromEmail } from './helpers/mailer'
import { form, redirectOf } from './helpers/navigation'
import { clearCookies, getCookie, restoreCookies, saveCookies, SESSION_COOKIE, signInAs } from './helpers/request'

type User = Awaited<ReturnType<typeof createUser>>

function requestChange(user: User, email: string, currentPassword = PASSWORD) {
  return updateProfileAction(undefined, form({ name: user.name ?? '', email, currentPassword }))
}

function confirmChange(token: string) {
  return confirmEmailAction(undefined, form({ token }))
}

async function signedInUser(overrides: Parameters<typeof createUser>[0] = {}) {
  const user = await createUser(overrides)
  await signInAs(user.id)
  return user
}

describe('requesting an email change', () => {
  test('stores the address as pending, emails it a link and tells the current address', async () => {
    const user = await signedInUser()
    expect(await requestChange(user, 'Next@Example.com')).toEqual({ success: true })

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(stored).toMatchObject({ email: user.email, pendingEmail: 'next@example.com' })
    expect(emailsOf('verifyEmailChange', 'next@example.com')).toHaveLength(1)

    await flushAfter()
    expect(emailsOf('emailChangeRequested', user.email)).toHaveLength(1)
  })

  test('needs the current password', async () => {
    const user = await signedInUser()
    expect(await requestChange(user, 'next@example.com', '')).toEqual({
      error: 'Enter your current password to change your email.',
    })
    expect(await requestChange(user, 'next@example.com', 'wrong password')).toEqual({
      error: 'Current password is incorrect.',
    })
    expect(sentEmails).toHaveLength(0)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).pendingEmail).toBeNull()
  })

  test('limits wrong current passwords per user', async () => {
    const user = await signedInUser()
    for (let i = 0; i < 5; i++) await requestChange(user, 'next@example.com', 'wrong password')
    expect((await requestChange(user, 'next@example.com'))?.error).toMatch(/^Too many attempts/)
  })

  test('needs a password on the account', async () => {
    const user = await signedInUser({ password: null })
    expect(await requestChange(user, 'next@example.com')).toEqual({
      error: 'Set a password before changing your email.',
    })
  })

  test('answers the same for an address another account uses, and that change never confirms', async () => {
    const owner = await createUser({ email: 'taken@example.com' })
    const user = await signedInUser()

    expect(await requestChange(user, 'taken@example.com')).toEqual({ success: true })
    expect(emailsOf('verifyEmailChange', 'taken@example.com')).toHaveLength(1)

    const token = tokenFromEmail(emailsOf('verifyEmailChange')[0])
    expect(await redirectOf(confirmChange(token))).toBe('/confirm-email')
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(user.email)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: owner.id } })).email).toBe('taken@example.com')
  })

  test('sends one link per address every 2 minutes, even when switching back and forth', async () => {
    const user = await signedInUser()
    expect(await requestChange(user, 'a@example.com')).toEqual({ success: true })
    expect(await requestChange(user, 'b@example.com')).toEqual({ success: true })
    expect((await requestChange(user, 'a@example.com'))?.error).toMatch(/^Too many attempts/)
    expect(emailsOf('verifyEmailChange')).toHaveLength(2)
  })

  test('allows 5 requests per user an hour', async () => {
    const user = await signedInUser()
    for (let i = 0; i < 5; i++) {
      expect(await requestChange(user, `n${i}@example.com`)).toEqual({ success: true })
    }
    expect((await requestChange(user, 'n5@example.com'))?.error).toMatch(/^Too many attempts/)
  })

  test('saves nothing and keeps the limits when the link can’t be sent', async () => {
    const user = await signedInUser()
    failNextEmails()
    expect((await requestChange(user, 'next@example.com'))?.error).toMatch(/^We couldn't send the confirmation email/)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).pendingEmail).toBeNull()
    expect(await requestChange(user, 'next@example.com')).toEqual({ success: true })
  })

  test('saving the current address again cancels a pending change and its link', async () => {
    const user = await signedInUser()
    await requestChange(user, 'next@example.com')
    expect(await requestChange(user, user.email, '')).toEqual({ success: true })
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).pendingEmail).toBeNull()
    expect(await prisma.verificationToken.count()).toBe(0)
  })

  test('requires a session', async () => {
    const user = await createUser()
    expect(await requestChange(user, 'next@example.com')).toEqual({ error: 'You must be signed in.' })
  })
})

describe('confirming an email change', () => {
  async function pendingChange() {
    const user = await signedInUser()
    await requestChange(user, 'next@example.com')
    return { user, token: tokenFromEmail(emailsOf('verifyEmailChange')[0]) }
  }

  test('in the account’s own browser switches the address and stays signed in', async () => {
    const { user, token } = await pendingChange()
    expect(await redirectOf(confirmChange(token))).toBe('/qrcodes')

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(stored).toMatchObject({ email: 'next@example.com', pendingEmail: null })
    expect(getCookie(SESSION_COOKIE)).toBeTruthy()

    await flushAfter()
    expect(emailsOf('emailChanged', user.email)).toHaveLength(1)
  })

  test('in another browser switches the address without signing in', async () => {
    const { user, token } = await pendingChange()
    clearCookies()
    expect(await redirectOf(confirmChange(token))).toBe('/email-changed')
    expect(getCookie(SESSION_COOKIE)).toBeUndefined()
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe('next@example.com')
  })

  test('in a browser signed in as someone else leaves that session alone', async () => {
    const { user, token } = await pendingChange()
    const other = await createUser()
    await signInAs(other.id)
    const otherSession = getCookie(SESSION_COOKIE)

    expect(await redirectOf(confirmChange(token))).toBe('/email-changed')
    expect(getCookie(SESSION_COOKIE)).toBe(otherSession)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe('next@example.com')
  })

  test('works once', async () => {
    const { token } = await pendingChange()
    await redirectOf(confirmChange(token))
    expect(await redirectOf(confirmChange(token))).toBe('/confirm-email')
  })

  test('confirms for nobody while the address is pending on two accounts', async () => {
    const first = await signedInUser()
    await requestChange(first, 'shared@example.com')
    const firstBrowser = saveCookies()

    const second = await signedInUser()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 3 * 60_000)
    try {
      expect(await requestChange(second, 'shared@example.com')).toEqual({ success: true })
    } finally {
      vi.useRealTimers()
    }

    const token = tokenFromEmail(emailsOf('verifyEmailChange').at(-1))
    restoreCookies(firstBrowser)
    expect(await redirectOf(confirmChange(token))).toBe('/confirm-email')
    expect(await prisma.user.count({ where: { email: 'shared@example.com' } })).toBe(0)
  })
})
