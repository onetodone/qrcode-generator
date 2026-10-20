import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'

/** Password of every user made by `createUser`. */
export const PASSWORD = 'correct horse battery'

let passwordHash: string | undefined

/** Empties every table. */
export async function truncateAll(): Promise<void> {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "QrCode", "Account", "VerificationToken", "User" CASCADE')
}

let counter = 0

/** A confirmed account with `PASSWORD`, unless the overrides say otherwise. */
export async function createUser(
  overrides: Partial<{
    email: string
    name: string
    password: string | null
    emailVerified: Date | null
    pendingEmail: string | null
    suspendedAt: Date | null
    passwordChangedAt: Date | null
  }> = {},
) {
  counter += 1
  passwordHash ??= await hashPassword(PASSWORD)
  return prisma.user.create({
    data: {
      email: `user${counter}@example.com`,
      name: `User ${counter}`,
      password: passwordHash,
      emailVerified: new Date(),
      termsAcceptedAt: new Date(),
      ...overrides,
    },
  })
}

/** A dynamic QR code of `userId` leading to `leadsTo`. */
export async function createQrCode(
  userId: string,
  overrides: Partial<{ leadsTo: string; disabledAt: Date | null; urlHash: string; createdAt: Date }> = {},
) {
  counter += 1
  const { urlHash = `hash${counter}`.padEnd(32, '0'), ...data } = overrides
  const code = await prisma.qrCode.create({
    data: { userId, leadsTo: 'https://example.com/', note: 'Flyer', urlHash, ...data },
  })
  return { ...code, urlHash }
}

/** A direct QR code of `userId` leading to `leadsTo`. */
export async function createDirectQrCode(userId: string, overrides: Partial<{ leadsTo: string }> = {}) {
  return prisma.qrCode.create({
    data: { userId, kind: 'DIRECT', leadsTo: 'https://example.com/', note: 'Sticker', ...overrides },
  })
}

/** Stores a verification token as `sendVerificationEmail` would. */
export async function createToken(
  identifier: string,
  type: 'EMAIL_VERIFY' | 'EMAIL_CHANGE' | 'PASSWORD_RESET',
  { token = `token-${++counter}`, expires = new Date(Date.now() + 60 * 60_000) } = {},
) {
  return prisma.verificationToken.create({ data: { identifier, type, token, expires } })
}
