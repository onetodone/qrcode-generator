import { describe, expect, test } from 'vitest'
import { forgotPasswordAction, loginAction, resetPasswordAction } from '@/actions/auth'
import { changePasswordAction } from '@/actions/profile'
import { auth, sessionCookieState } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'
import { createToken, createUser, PASSWORD } from './helpers/db'
import { flushAfter } from './helpers/after'
import { emailsOf, sentEmails, tokenFromEmail } from './helpers/mailer'
import { form, redirectOf } from './helpers/navigation'
import {
  clearCookies,
  getCookie,
  restoreCookies,
  saveCookies,
  SESSION_COOKIE,
  setClientIp,
  signInAs,
} from './helpers/request'

const NEW_PASSWORD = 'brand new password'

function reset(token: string, password = NEW_PASSWORD) {
  return resetPasswordAction(undefined, form({ token, newPassword: password, confirmPassword: password }))
}

describe('forgot password', () => {
  test('gives every address the same answer and emails only existing accounts', async () => {
    const user = await createUser()
    for (const email of [user.email, 'nobody@example.com']) {
      expect(await forgotPasswordAction(undefined, form({ email }))).toEqual({ success: true })
    }
    expect(sentEmails).toHaveLength(0)
    await flushAfter()
    expect(sentEmails.map((email) => [email.template, email.to])).toEqual([['resetPassword', user.email]])
  })
})

describe('password reset', () => {
  test('sets the password, ends every session and signs this browser out', async () => {
    const user = await createUser()
    await signInAs(user.id)
    const oldSession = saveCookies()
    const { token } = await createToken(user.email, 'PASSWORD_RESET')

    expect(await redirectOf(reset(token))).toBe('/password-updated')
    expect(getCookie(SESSION_COOKIE)).toBeUndefined()

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(await verifyPassword(NEW_PASSWORD, stored.password ?? '')).toBe(true)
    expect(stored.passwordChangedAt).not.toBeNull()

    restoreCookies(oldSession)
    expect(await sessionCookieState()).toBe('revoked')
    await signInAs(user.id, { checkedAt: 0 })
    expect(await auth()).toBeNull()
  })

  test('lifts the failed sign-in limit of the account', async () => {
    const user = await createUser()
    for (let i = 0; i < 10; i++) {
      setClientIp(`198.51.100.${i + 1}`)
      await loginAction(undefined, form({ email: user.email, password: 'wrong' }))
    }
    const { token } = await createToken(user.email, 'PASSWORD_RESET')
    await redirectOf(reset(token))

    setClientIp('192.0.2.50')
    clearCookies()
    expect(await redirectOf(loginAction(undefined, form({ email: user.email, password: NEW_PASSWORD })))).toContain(
      '/qrcodes',
    )
  })

  test('confirms the address of an unconfirmed account', async () => {
    const user = await createUser({ emailVerified: null, password: null })
    const { token } = await createToken(user.email, 'PASSWORD_RESET')
    await redirectOf(reset(token))
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerified).not.toBeNull()
  })

  test('works once', async () => {
    const user = await createUser()
    const { token } = await createToken(user.email, 'PASSWORD_RESET')
    await redirectOf(reset(token))
    expect(await reset(token, 'another password')).toEqual({
      error: 'This reset link is invalid or has already been used.',
    })
  })

  test('refuses expired tokens and tokens of other types', async () => {
    const user = await createUser()
    const expired = await createToken(user.email, 'PASSWORD_RESET', { expires: new Date(Date.now() - 1000) })
    expect(await reset(expired.token)).toEqual({ error: 'This reset link has expired. Request a new one.' })

    const verify = await createToken(user.email, 'EMAIL_VERIFY')
    expect(await reset(verify.token)).toEqual({ error: 'This reset link is invalid or has already been used.' })

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    expect(await verifyPassword(PASSWORD, stored.password ?? '')).toBe(true)
  })

  test('the emailed link resets the password', async () => {
    const user = await createUser()
    await forgotPasswordAction(undefined, form({ email: user.email }))
    await flushAfter()
    expect(await redirectOf(reset(tokenFromEmail(emailsOf('resetPassword')[0])))).toBe('/password-updated')
  })
})

describe('changing the password', () => {
  test('ends other sessions and keeps this one', async () => {
    const user = await createUser()
    await signInAs(user.id)
    const otherBrowser = saveCookies()

    const result = await changePasswordAction(
      undefined,
      form({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD }),
    )
    expect(result).toEqual({ success: true })
    expect(await sessionCookieState()).toBe('recent')

    restoreCookies(otherBrowser)
    expect(await sessionCookieState()).toBe('revoked')
  })

  test('needs the current password', async () => {
    const user = await createUser()
    await signInAs(user.id)
    const result = await changePasswordAction(
      undefined,
      form({ currentPassword: 'wrong password', newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD }),
    )
    expect(result).toEqual({ error: 'Current password is incorrect.' })
  })
})
