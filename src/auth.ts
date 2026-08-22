import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/verification'
import { loginSchema } from '@/schemas/auth'

export class EmailNotVerifiedSignin extends CredentialsSignin {
  code = 'email_not_verified'
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

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Credentials-based auth only supports JWT sessions, not database sessions.
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  // The app is meant to run behind a reverse proxy on whatever host it's
  // deployed at (see the dashboard's dynamic redirect-link derivation from
  // request headers), so there's no single fixed canonical host to check
  // requests against in production.
  trustHost: true,
  logger: {
    error(error) {
      // Expected on every wrong email/password attempt (or a login retried
      // after the account was deleted) — already caught and shown to the
      // user as "Invalid email or password" by `loginAction`. Logging it
      // with a full stack trace here just reads like a crash.
      if (error instanceof CredentialsSignin) return
      console.error(error)
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        verificationToken: { label: 'Verification token', type: 'text' },
      },
      authorize: async (credentials) => {
        if (typeof credentials?.verificationToken === 'string') {
          const record = await prisma.verificationToken.findUnique({
            where: { token: credentials.verificationToken },
          })
          if (!record) throw new VerificationTokenInvalidSignin()

          if (record.expires < new Date()) {
            await prisma.verificationToken.delete({ where: { token: credentials.verificationToken } })
            throw new VerificationTokenExpiredSignin(record.identifier)
          }

          await prisma.verificationToken.delete({ where: { token: credentials.verificationToken } })
          const user = await prisma.user.update({
            where: { email: record.identifier },
            data: { emailVerified: new Date() },
          })
          return { id: user.id, email: user.email, name: user.name }
        }

        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })
        if (!user) return null

        const passwordsMatch = await bcrypt.compare(parsed.data.password, user.password)
        if (!passwordsMatch) return null

        if (!user.emailVerified) {
          await sendVerificationEmail(user.email)
          throw new EmailNotVerifiedSignin()
        }

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Just verified in `authorize()` moments ago — no need to re-check.
        token.id = user.id as string
        return token
      }

      // Triggered by `unstable_update()` from the profile Server Action —
      // otherwise the JWT would keep the stale name/email until re-login.
      if (trigger === 'update' && session?.user) {
        if (session.user.name !== undefined) token.name = session.user.name
        if (session.user.email !== undefined) token.email = session.user.email
        return token
      }

      // Every other read of an existing JWT: since JWT sessions aren't
      // re-validated against the DB by default, a deleted account would
      // otherwise stay "logged in" with a token pointing at nothing, and
      // every page/action using session.user.id would silently misbehave.
      // Returning null here revokes the session.
      if (typeof token.id === 'string') {
        const stillExists = await prisma.user.findUnique({
          where: { id: token.id },
          select: { id: true },
        })
        if (!stillExists) return null
      }

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
