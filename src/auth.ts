import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { Prisma, VerificationTokenType } from '@/generated/client'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/verification'
import { loginSchema } from '@/schemas/auth'
import { verifyPasswordConstantTime } from '@/lib/password'
import { clearRateLimit, rateLimit, refundRateLimit } from '@/lib/rate-limit'
import { clientIpFromHeaders } from '@/lib/request'
import { logger } from '@/lib/logger'

export class EmailNotVerifiedSignin extends CredentialsSignin {
  code = 'email_not_verified'
}

export class ConfirmationEmailFailedSignin extends CredentialsSignin {
  code = 'confirmation_email_failed'
}

export class VerificationTokenExpiredSignin extends CredentialsSignin {
  code = 'verification_token_expired'
  constructor(public email: string) {
    super()
  }
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

async function passwordChangedAtMs(userId: string): Promise<number | null> {
  const record = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordChangedAt: true },
  })
  if (!record) return null
  return record.passwordChangedAt?.getTime() ?? 0
}

const SESSION_REVALIDATE_MS = 30_000

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
          const record = await prisma.verificationToken.findUnique({
            where: { token: credentials.verificationToken },
          })
          if (!record) throw new VerificationTokenInvalidSignin()

          if (
            record.type !== VerificationTokenType.EMAIL_VERIFY &&
            record.type !== VerificationTokenType.EMAIL_CHANGE
          ) {
            throw new VerificationTokenInvalidSignin()
          }

          if (record.expires < new Date()) {
            await prisma.verificationToken.delete({ where: { token: credentials.verificationToken } })
            throw new VerificationTokenExpiredSignin(record.identifier)
          }

          await prisma.verificationToken.delete({ where: { token: credentials.verificationToken } })

          if (record.type === VerificationTokenType.EMAIL_CHANGE) {
            const pendingUser = await prisma.user.findFirst({ where: { pendingEmail: record.identifier } })
            if (!pendingUser) throw new VerificationTokenInvalidSignin()

            try {
              const user = await prisma.user.update({
                where: { id: pendingUser.id },
                data: { email: record.identifier, emailVerified: new Date(), pendingEmail: null },
              })
              return { id: user.id, email: user.email, name: user.name }
            } catch (error) {
              // Someone else claimed this email address while the confirmation was pending.
              if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new VerificationTokenInvalidSignin()
              }
              throw error
            }
          }

          const user = await prisma.user.update({
            where: { email: record.identifier },
            data: { emailVerified: new Date() },
          })
          return { id: user.id, email: user.email, name: user.name }
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
        token.passwordChangedAt = (await passwordChangedAtMs(userId)) ?? 0
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
          select: { name: true, email: true, passwordChangedAt: true },
        })
        if (!record) return null
        if ((record.passwordChangedAt?.getTime() ?? 0) > issuedFor) return null
        token.name = record.name
        token.email = record.email
        token.checkedAt = Date.now()
        return token
      }

      const checkedAt = typeof token.checkedAt === 'number' ? token.checkedAt : 0
      if (Date.now() - checkedAt < SESSION_REVALIDATE_MS) return token

      const changedAt = await passwordChangedAtMs(userId)
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
