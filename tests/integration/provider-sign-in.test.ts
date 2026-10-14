import { describe, expect, test } from 'vitest'
import type { Account, Profile, User } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import { authCallbacks, authorizeProviderSignIn, sessionCookieState } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createQrCode, createToken, createUser } from './helpers/db'
import { setCookie, SESSION_COOKIE, signInAs } from './helpers/request'

const MINUTE = 60_000

function googleAccount(providerAccountId = 'google-1'): Account {
  return { provider: 'google', type: 'oidc', providerAccountId }
}

function googleUser(email: string): User {
  return { id: 'adapter-id', email, name: 'Ann' }
}

const verified: Profile = { email_verified: true }
const unverified: Profile = { email_verified: false }

async function linkGoogle(userId: string, providerAccountId = 'google-1') {
  await prisma.account.create({ data: { userId, type: 'oidc', provider: 'google', providerAccountId } })
}

describe('sessionCookieState', () => {
  test('is none without a session cookie', async () => {
    expect(await sessionCookieState()).toBe('none')
  })

  test('is recent within 10 minutes of signing in, stale after', async () => {
    const user = await createUser()
    await signInAs(user.id, { signedInAt: Date.now() - 9 * MINUTE })
    expect(await sessionCookieState()).toBe('recent')
    await signInAs(user.id, { signedInAt: Date.now() - 11 * MINUTE })
    expect(await sessionCookieState()).toBe('stale')
  })

  test('is revoked for a token that doesn’t decode, a gone or suspended account, or a changed password', async () => {
    setCookie(SESSION_COOKIE, 'garbage')
    expect(await sessionCookieState()).toBe('revoked')

    await signInAs('missing-user')
    expect(await sessionCookieState()).toBe('revoked')

    const suspended = await createUser({ suspendedAt: new Date() })
    await signInAs(suspended.id)
    expect(await sessionCookieState()).toBe('revoked')

    const changed = await createUser({ passwordChangedAt: new Date() })
    await signInAs(changed.id, { passwordChangedAt: Date.now() - MINUTE })
    expect(await sessionCookieState()).toBe('revoked')
  })

  test('is revoked when Auth.js might read the cookie differently', async () => {
    const user = await createUser()
    const token = await signInAs(user.id)
    setCookie(`${SESSION_COOKIE}x`, token)
    expect(await sessionCookieState()).toBe('revoked')
  })
})

describe('authorizeProviderSignIn', () => {
  test('signs a linked provider account in', async () => {
    const user = await createUser()
    await linkGoogle(user.id)
    expect(await authorizeProviderSignIn(googleUser(user.email), googleAccount(), unverified)).toBe(true)
  })

  test('refuses a linked account that is suspended', async () => {
    const user = await createUser({ suspendedAt: new Date() })
    await linkGoogle(user.id)
    expect(await authorizeProviderSignIn(googleUser(user.email), googleAccount(), verified)).toBe(
      '/login?error=AccountSuspended',
    )
  })

  test('links a new provider to a session from the last 10 minutes only', async () => {
    const user = await createUser()
    await signInAs(user.id)
    expect(await authorizeProviderSignIn(googleUser('other@example.com'), googleAccount(), unverified)).toBe(true)

    await signInAs(user.id, { signedInAt: Date.now() - 11 * MINUTE })
    expect(await authorizeProviderSignIn(googleUser(user.email), googleAccount(), verified)).toBe(
      '/login?error=ReauthRequired',
    )

    setCookie(SESSION_COOKIE, 'garbage')
    expect(await authorizeProviderSignIn(googleUser(user.email), googleAccount(), verified)).toBe(
      '/login?error=SessionExpired',
    )
  })

  test('without a session, needs an address the provider verified', async () => {
    expect(await authorizeProviderSignIn(googleUser('new@example.com'), googleAccount(), unverified)).toBe(
      '/login?error=EmailNotVerified',
    )
    expect(await authorizeProviderSignIn(googleUser('new@example.com'), googleAccount(), undefined)).toBe(
      '/login?error=EmailNotVerified',
    )
    expect(await authorizeProviderSignIn(googleUser('new@example.com'), googleAccount(), verified)).toBe(true)
  })

  test('refuses a provider that isn’t enabled', async () => {
    const account = { ...googleAccount(), provider: 'github' }
    expect(await authorizeProviderSignIn(googleUser('new@example.com'), account, verified)).toBe(
      '/login?error=EmailNotVerified',
    )
  })

  test('lowercases the address for the account Auth.js creates', async () => {
    const user = googleUser('New.User@Example.COM')
    await authorizeProviderSignIn(user, googleAccount(), verified)
    expect(user.email).toBe('new.user@example.com')
  })

  test('replaces a registration nobody confirmed, but not a confirmed or used account', async () => {
    const unconfirmed = await createUser({ email: 'claim@example.com', emailVerified: null, password: null })
    await createToken(unconfirmed.email, 'EMAIL_VERIFY')
    expect(await authorizeProviderSignIn(googleUser('Claim@example.com'), googleAccount(), verified)).toBe(true)
    expect(await prisma.user.count({ where: { email: 'claim@example.com' } })).toBe(0)
    expect(await prisma.verificationToken.count()).toBe(0)

    const confirmed = await createUser({ email: 'kept@example.com' })
    const withCodes = await createUser({ email: 'codes@example.com', emailVerified: null })
    await createQrCode(withCodes.id)
    await authorizeProviderSignIn(googleUser(confirmed.email), googleAccount('google-2'), verified)
    await authorizeProviderSignIn(googleUser(withCodes.email), googleAccount('google-3'), verified)
    expect(await prisma.user.count()).toBe(2)
  })
})

describe('jwt callback', () => {
  type JwtParams = Parameters<typeof authCallbacks.jwt>[0]

  function jwt(params: Partial<JwtParams>) {
    return authCallbacks.jwt({ token: {}, ...params } as JwtParams)
  }

  test('deletes an account created from an unverified provider address', async () => {
    const user = await createUser({ password: null })
    const result = await jwt({ user, account: googleAccount(), profile: unverified, trigger: 'signUp' })
    expect(result).toBeNull()
    expect(await prisma.user.count()).toBe(0)
  })

  test('keeps an account created from a verified address', async () => {
    const user = await createUser({ password: null })
    const result = await jwt({ user, account: googleAccount(), profile: verified, trigger: 'signUp' })
    expect(result).toMatchObject({ id: user.id, passwordChangedAt: 0 })
    expect(await prisma.user.count()).toBe(1)
  })

  test('takes a session update’s name and email from the database, not the client', async () => {
    const user = await createUser({ name: 'Stored' })
    const token: JWT = { id: user.id, passwordChangedAt: 0, name: 'Old' }
    const result = await jwt({ token, trigger: 'update', session: { user: { name: 'Injected', email: 'x@evil' } } })
    expect(result).toMatchObject({ name: 'Stored', email: user.email })
  })

  test('a session update can’t revive a revoked session', async () => {
    const user = await createUser({ passwordChangedAt: new Date() })
    expect(await jwt({ token: { id: user.id, passwordChangedAt: 0 }, trigger: 'update' })).toBeNull()
  })

  test('rechecks the account at most every 30 seconds', async () => {
    const user = await createUser()
    const fresh: JWT = { id: user.id, passwordChangedAt: 0, checkedAt: Date.now() }
    await prisma.user.update({ where: { id: user.id }, data: { suspendedAt: new Date() } })
    expect(await jwt({ token: fresh })).toBe(fresh)
    expect(await jwt({ token: { ...fresh, checkedAt: Date.now() - 30_000 } })).toBeNull()
  })
})
