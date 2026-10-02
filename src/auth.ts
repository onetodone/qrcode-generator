import NextAuth, { CredentialsSignin, type User } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { Prisma, VerificationTokenType } from '@/generated/client'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/verification'
import { sendEmailChangedNotice } from '@/lib/account-emails'
import { afterResponse } from '@/lib/after-response'
import { loginSchema } from '@/schemas/auth'
import { passwordField } from '@/schemas/password'
import { hashPassword, verifyPasswordConstantTime } from '@/lib/password'
import { clearRateLimit, rateLimit, refundRateLimit } from '@/lib/rate-limit'
import { clientIpFromHeaders } from '@/lib/request'
import { logger } from '@/lib/logger'

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

const SESSION_REVALIDATE_MS = 30_000

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
  pages: { signIn: '/login' },
  trustHost: true,
  logger: {
    error(error) {
      if (error instanceof CredentialsSignin) return
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
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        // Just verified in `authorize()` moments ago — no need to re-check.
        const userId = user.id as string
        token.id = userId
        const securityState = await prisma.user.findUnique({
          where: { id: userId },
          select: { passwordChangedAt: true, suspendedAt: true },
        })
        if (!securityState || securityState.suspendedAt) return null
        token.passwordChangedAt = securityState.passwordChangedAt?.getTime() ?? 0
        token.checkedAt = Date.now()
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

      const record = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordChangedAt: true, suspendedAt: true },
      })
      if (!record || record.suspendedAt) return null
      if ((record.passwordChangedAt?.getTime() ?? 0) > issuedFor) return null
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
