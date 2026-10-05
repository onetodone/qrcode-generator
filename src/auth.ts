import NextAuth, { AuthError, CredentialsSignin, type Account, type Profile, type User } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { decode } from 'next-auth/jwt'
import { cookies } from 'next/headers'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { Prisma, VerificationTokenType } from '@/generated/client'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/verification'
import { sendEmailChangedNotice, sendProviderConnectedNotice } from '@/lib/account-emails'
import { afterResponse } from '@/lib/after-response'
import { loginSchema } from '@/schemas/auth'
import { passwordField } from '@/schemas/password'
import { hashPassword, verifyPasswordConstantTime } from '@/lib/password'
import { clearRateLimit, rateLimit, refundRateLimit } from '@/lib/rate-limit'
import { clientIpFromHeaders } from '@/lib/request'
import { logger } from '@/lib/logger'
import { enabledOAuthProviders, findOAuthProvider, oauthProviderName, ProviderSignInError } from '@/lib/oauth-providers'

export class EmailNotVerifiedSignin extends CredentialsSignin {
  code = 'email_not_verified'
}

export class AccountSuspendedSignin extends CredentialsSignin {
  code = 'account_suspended'
}

export class ConfirmationEmailFailedSignin extends CredentialsSignin {
  code = 'confirmation_email_failed'
}

export class VerificationTokenInvalidSignin extends CredentialsSignin {
  code = 'verification_token_invalid'
}

export class RateLimitedSignin extends CredentialsSignin {
  code = 'rate_limited'
  constructor(public retryAfterMs: number) {
    super()
  }
}

const LOGIN_LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 }

function loginEmailKey(email: string): string {
  return `login:email:${email.toLowerCase()}`
}

/** Lets the account's owner sign in again right after a password reset. */
export function clearLoginAttempts(email: string): void {
  clearRateLimit(loginEmailKey(email))
}

/** `passwordChangedAt` in ms, or `null` when the account is gone or suspended, so its sessions end. */
async function activePasswordChangedAtMs(userId: string): Promise<number | null> {
  const record = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordChangedAt: true, suspendedAt: true },
  })
  if (!record || record.suspendedAt) return null
  return record.passwordChangedAt?.getTime() ?? 0
}

const SESSION_REVALIDATE_MS = 30_000

// Rejections a user can cause on their own: cancelled consent, an address
// that belongs to another account, a provider account without a verified email.
const EXPECTED_SIGN_IN_ERRORS = new Set(['AccessDenied', 'OAuthAccountNotLinked', 'OAuthCallbackError'])

function signInErrorUrl(code: string): string {
  return `/login?error=${code}`
}

const RECENT_SIGN_IN_MS = 10 * 60 * 1000

const SESSION_COOKIE = /^((?:__Secure-)?authjs\.session-token)(?:\.(\d+))?$/

/**
 * The request's session cookie, checked against the database now rather than
 * through the `jwt` callback, which trusts a session for up to 30 s: `none`
 * without one, `revoked` when it no longer counts, otherwise `recent` or
 * `stale` depending on whether its sign-in was within the last 10 minutes.
 * Connecting a provider and deleting an account without a password need a
 * `recent` one, so a stolen session can't turn into lasting access.
 */
export async function sessionCookieState(): Promise<'none' | 'revoked' | 'stale' | 'recent'> {
  const chunks: { name: string; index: number; value: string }[] = []
  for (const cookie of (await cookies()).getAll()) {
    const match = SESSION_COOKIE.exec(cookie.name)
    if (match?.[1]) chunks.push({ name: match[1], index: Number(match[2] ?? 0), value: cookie.value })
  }
  const salt = chunks[0]?.name
  if (!salt) return 'none'

  const value = chunks
    .filter((chunk) => chunk.name === salt)
    .sort((a, b) => a.index - b.index)
    .map((chunk) => chunk.value)
    .join('')

  let token
  try {
    token = await decode({ token: value, secret: process.env.AUTH_SECRET ?? '', salt })
  } catch {
    return 'revoked'
  }
  if (!token || typeof token.id !== 'string') return 'revoked'

  const changedAt = await activePasswordChangedAtMs(token.id)
  const issuedFor = typeof token.passwordChangedAt === 'number' ? token.passwordChangedAt : 0
  if (changedAt === null || changedAt > issuedFor) return 'revoked'

  const signedInAt = typeof token.signedInAt === 'number' ? token.signedInAt : 0
  return Date.now() - signedInAt < RECENT_SIGN_IN_MS ? 'recent' : 'stale'
}

/**
 * Decides a sign-in through a third-party provider. A known provider account
 * signs in unless its user is suspended. A new one is linked to the signed-in
 * user when the session is recent; Auth.js links to any session cookie it can
 * decode, so a revoked or old one is refused first. Without a session, it
 * needs an email address the provider has verified and creates an account;
 * an address that already has an account is refused by Auth.js unless that
 * account was never confirmed.
 */
async function authorizeProviderSignIn(
  user: User,
  account: Account,
  profile: Profile | undefined,
): Promise<boolean | string> {
  const linked = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: account.provider, providerAccountId: account.providerAccountId } },
    select: { user: { select: { suspendedAt: true } } },
  })
  if (linked) {
    return linked.user.suspendedAt ? signInErrorUrl(ProviderSignInError.AccountSuspended) : true
  }

  switch (await sessionCookieState()) {
    case 'revoked':
      return signInErrorUrl(ProviderSignInError.SessionExpired)
    case 'stale':
      return signInErrorUrl(ProviderSignInError.ReauthRequired)
    case 'recent':
      return true
  }

  const provider = findOAuthProvider(account.provider)
  if (!provider || !profile || !user.email || !provider.hasVerifiedEmail(profile)) {
    return signInErrorUrl(ProviderSignInError.EmailNotVerified)
  }

  // Auth.js looks the address up exactly; this object is the one it then
  // uses, so an existing account in any letter case is found.
  const existing = await prisma.user.findFirst({
    where: { email: { equals: user.email, mode: 'insensitive' } },
    select: { email: true },
  })
  user.email = existing?.email ?? user.email.toLowerCase()

  // A registration nobody confirmed only holds the address; the provider has
  // just shown that it belongs to this user.
  const email = user.email
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.user.deleteMany({
      where: { email, emailVerified: null, accounts: { none: {} }, qrCodes: { none: {} } },
    })
    if (count > 0) await tx.verificationToken.deleteMany({ where: { identifier: email } })
  })
  return true
}

/** Deletes the token. False when it was already gone, so a token works once even under concurrent requests. */
async function consumeToken(token: string): Promise<boolean> {
  const { count } = await prisma.verificationToken.deleteMany({ where: { token } })
  return count === 1
}

/**
 * Signs in from an email confirmation token. Confirming a new account's address
 * also sets its password; confirming an email change switches the address and
 * notifies the previous one.
 */
async function confirmEmail(token: string, password: unknown, request: Request): Promise<User> {
  const record = await prisma.verificationToken.findUnique({ where: { token } })
  if (!record || record.expires < new Date()) throw new VerificationTokenInvalidSignin()

  if (record.type === VerificationTokenType.EMAIL_VERIFY) {
    // Whoever confirms the address chooses the password, so a password set by
    // someone who registered the address first never signs in. For the same
    // reason the confirmation page asks for agreement to the terms again.
    const parsed = passwordField.safeParse(password)
    if (!parsed.success) throw new VerificationTokenInvalidSignin()
    const passwordHash = await hashPassword(parsed.data)

    if (!(await consumeToken(token))) throw new VerificationTokenInvalidSignin()
    const user = await prisma.user.findUnique({ where: { email: record.identifier } })
    if (!user || user.emailVerified) throw new VerificationTokenInvalidSignin()

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date(), password: passwordHash, termsAcceptedAt: new Date() },
    })
    return { id: user.id, email: user.email, name: user.name }
  }

  if (record.type === VerificationTokenType.EMAIL_CHANGE) {
    if (!(await consumeToken(token))) throw new VerificationTokenInvalidSignin()
    const pendingUser = await prisma.user.findFirst({ where: { pendingEmail: record.identifier } })
    if (!pendingUser) throw new VerificationTokenInvalidSignin()

    let user
    try {
      user = await prisma.user.update({
        where: { id: pendingUser.id },
        data: { email: record.identifier, emailVerified: new Date(), pendingEmail: null },
      })
    } catch (error) {
      // Someone else claimed this email address while the confirmation was pending.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new VerificationTokenInvalidSignin()
      }
      throw error
    }

    const newEmail = user.email
    const ip = clientIpFromHeaders(request.headers)
    afterResponse('auth.email_changed_notice_failed', () => sendEmailChangedNotice(pendingUser, newEmail, ip))
    return { id: user.id, email: user.email, name: user.name }
  }

  throw new VerificationTokenInvalidSignin()
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Credentials-based auth only supports JWT sessions, not database sessions.
  session: { strategy: 'jwt' },
  pages: { signIn: '/login', error: '/login' },
  trustHost: true,
  logger: {
    error(error) {
      if (error instanceof CredentialsSignin) return
      if (error instanceof AuthError && EXPECTED_SIGN_IN_ERRORS.has(error.type)) {
        logger.warn('auth.sign_in_rejected', { error })
        return
      }
      logger.error('auth.error', { error })
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        verificationToken: { label: 'Verification token', type: 'text' },
      },
      authorize: async (credentials, request) => {
        if (typeof credentials?.verificationToken === 'string') {
          return confirmEmail(credentials.verificationToken, credentials.password, request)
        }

        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        // Limited here rather than in `loginAction`, since `POST
        // /api/auth/callback/credentials` reaches `authorize()` directly. An
        // attempt with the right password is refunded, so successful sign-ins
        // don't use up the limit of a shared IP or of the account.
        const limitKeys = [`login:ip:${clientIpFromHeaders(request.headers)}`, loginEmailKey(parsed.data.email)]
        const limits = limitKeys.map((key) => rateLimit(key, LOGIN_LIMIT))
        const refundAttempt = () => limitKeys.forEach(refundRateLimit)
        const blocked = limits.filter((limit) => !limit.ok)
        if (blocked.length > 0) {
          refundAttempt()
          throw new RateLimitedSignin(Math.max(...blocked.map((limit) => limit.retryAfterMs)))
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })
        const passwordsMatch = await verifyPasswordConstantTime(parsed.data.password, user?.password)
        if (!user || !passwordsMatch) return null
        refundAttempt()

        if (user.suspendedAt) throw new AccountSuspendedSignin()

        if (!user.emailVerified) {
          try {
            await sendVerificationEmail(user.email)
          } catch (error) {
            logger.error('auth.confirmation_email_failed', { error })
            throw new ConfirmationEmailFailedSignin()
          }
          throw new EmailNotVerifiedSignin()
        }

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
    ...enabledOAuthProviders().map((provider) => provider.create()),
  ],
  events: {
    // Only provider sign-ins create users through the adapter, after the
    // `signIn` callback has checked the address. Continuing past the terms
    // notice next to the provider buttons accepts them.
    async createUser({ user }) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date(), termsAcceptedAt: new Date(), image: null },
      })
    },
    // A new user arrives here straight from `createUser`, still without
    // `emailVerified` on this object; only links to existing accounts notify.
    async linkAccount({ user, account }) {
      if (!('emailVerified' in user) || !user.emailVerified || !user.email) return
      const recipient = { email: user.email, name: user.name ?? null }
      afterResponse('auth.provider_connected_notice_failed', () =>
        sendProviderConnectedNotice(recipient, oauthProviderName(account.provider)),
      )
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || account.type === 'credentials') return true
      return authorizeProviderSignIn(user, account, profile)
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        // Just signed in; the checks below start from the database state.
        const userId = user.id as string
        token.id = userId
        const changedAt = await activePasswordChangedAtMs(userId)
        if (changedAt === null) return null
        token.passwordChangedAt = changedAt
        token.checkedAt = Date.now()
        token.signedInAt = Date.now()
        return token
      }

      if (typeof token.id !== 'string') return token
      const userId = token.id
      const issuedFor = typeof token.passwordChangedAt === 'number' ? token.passwordChangedAt : 0

      // `POST /api/auth/session` triggers an update too, so its payload is
      // client-controlled: everything comes from the database instead, and a
      // revoked session stays revoked.
      if (trigger === 'update') {
        const record = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true, passwordChangedAt: true, suspendedAt: true },
        })
        if (!record || record.suspendedAt) return null
        if ((record.passwordChangedAt?.getTime() ?? 0) > issuedFor) return null
        token.name = record.name
        token.email = record.email
        token.checkedAt = Date.now()
        return token
      }

      const checkedAt = typeof token.checkedAt === 'number' ? token.checkedAt : 0
      if (Date.now() - checkedAt < SESSION_REVALIDATE_MS) return token

      const changedAt = await activePasswordChangedAtMs(userId)
      if (changedAt === null) return null
      if (changedAt > issuedFor) return null
      token.checkedAt = Date.now()

      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
