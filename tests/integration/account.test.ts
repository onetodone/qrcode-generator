import { describe, expect, test } from 'vitest'
import { deleteAccountAction, disconnectProviderAction, sendSetPasswordLinkAction } from '@/actions/profile'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/verification'
import { createQrCode, createToken, createUser, PASSWORD } from './helpers/db'
import { emailsOf, failNextEmails } from './helpers/mailer'
import { form, redirectOf } from './helpers/navigation'
import { getCookie, SESSION_COOKIE, signInAs } from './helpers/request'

describe('deleting the account', () => {
  test('removes the account, its codes and links, and signs out', async () => {
    const user = await createUser({ pendingEmail: 'next@example.com' })
    await createQrCode(user.id)
    await createToken('next@example.com', 'EMAIL_CHANGE')
    await signInAs(user.id)

    expect(await redirectOf(deleteAccountAction(undefined, form({ currentPassword: PASSWORD })))).toContain(
      '/account-deleted',
    )
    expect(await prisma.user.count()).toBe(0)
    expect(await prisma.qrCode.count()).toBe(0)
    expect(await prisma.verificationToken.count()).toBe(0)
    expect(getCookie(SESSION_COOKIE)).toBeUndefined()
  })

  test('needs the current password', async () => {
    const user = await createUser()
    await signInAs(user.id)
    expect(await deleteAccountAction(undefined, form({ currentPassword: 'wrong password' }))).toEqual({
      error: 'Current password is incorrect.',
    })
    expect(await prisma.user.count()).toBe(1)
  })

  test('without a password, needs the email typed in and a recent sign-in', async () => {
    const user = await createUser({ password: null })
    await signInAs(user.id, { signedInAt: Date.now() - 11 * 60_000 })
    expect(await deleteAccountAction(undefined, form({ confirmEmail: 'wrong@example.com' }))).toEqual({
      error: 'Enter your email address to delete your account.',
    })
    expect((await deleteAccountAction(undefined, form({ confirmEmail: user.email })))?.error).toMatch(/sign in again/i)

    await signInAs(user.id)
    await redirectOf(deleteAccountAction(undefined, form({ confirmEmail: ` ${user.email.toUpperCase()} ` })))
    expect(await prisma.user.count()).toBe(0)
  })
})

describe('provider-only accounts', () => {
  test('can’t disconnect their last way to sign in', async () => {
    const user = await createUser({ password: null })
    await prisma.account.create({
      data: { userId: user.id, type: 'oidc', provider: 'google', providerAccountId: 'g-1' },
    })
    await signInAs(user.id)

    expect((await disconnectProviderAction(undefined, form({ provider: 'google' })))?.error).toMatch(
      /^Google is the only way to sign in/,
    )
    expect(await prisma.account.count()).toBe(1)
  })

  test('disconnect a provider when a password is set', async () => {
    const user = await createUser()
    await prisma.account.create({
      data: { userId: user.id, type: 'oidc', provider: 'google', providerAccountId: 'g-1' },
    })
    await signInAs(user.id)
    expect(await disconnectProviderAction(undefined, form({ provider: 'google' }))).toEqual({ success: true })
    expect(await prisma.account.count()).toBe(0)
  })

  test('get a link to set a password, once per 2 minutes', async () => {
    const user = await createUser({ password: null })
    await signInAs(user.id)
    expect(await sendSetPasswordLinkAction()).toEqual({ success: true })
    expect((await sendSetPasswordLinkAction())?.error).toMatch(/^A link was sent a moment ago/)
    expect(emailsOf('resetPassword', user.email)).toHaveLength(1)
  })
})

describe('sendVerificationEmail', () => {
  test('replaces earlier tokens of the same type only', async () => {
    const user = await createUser()
    const reset = await createToken(user.email, 'PASSWORD_RESET')
    await createToken(user.email, 'EMAIL_VERIFY', { token: 'old-verify' })
    await prisma.verificationToken.updateMany({ data: { createdAt: new Date(Date.now() - 3 * 60_000) } })

    expect(await sendVerificationEmail(user.email)).toBe(true)
    const tokens = await prisma.verificationToken.findMany({ orderBy: { createdAt: 'asc' } })
    expect(tokens.map((token) => token.type)).toEqual(['PASSWORD_RESET', 'EMAIL_VERIFY'])
    expect(tokens[0]?.token).toBe(reset.token)
    expect(tokens[1]?.token).not.toBe('old-verify')
    expect(tokens[1]?.expires.getTime()).toBeGreaterThan(Date.now() + 23 * 60 * 60_000)
  })

  test('keeps the earlier link valid when the email can’t be sent', async () => {
    const user = await createUser()
    await createToken(user.email, 'PASSWORD_RESET', { token: 'still-valid' })
    await prisma.verificationToken.updateMany({ data: { createdAt: new Date(Date.now() - 3 * 60_000) } })

    failNextEmails()
    await expect(sendVerificationEmail(user.email, 'PASSWORD_RESET')).rejects.toThrow('SMTP server unreachable')
    expect(await prisma.verificationToken.findMany({ select: { token: true } })).toEqual([{ token: 'still-valid' }])
  })

  test('password reset links expire after 20 minutes', async () => {
    const user = await createUser()
    await sendVerificationEmail(user.email, 'PASSWORD_RESET')
    const token = await prisma.verificationToken.findFirstOrThrow()
    expect(token.expires.getTime() - token.createdAt.getTime()).toBeCloseTo(20 * 60_000, -3)
    expect(emailsOf('resetPassword')[0]?.props.resetUrl).toBe(
      `http://localhost:3000/reset-password?token=${token.token}`,
    )
  })
})
