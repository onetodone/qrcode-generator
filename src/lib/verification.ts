import crypto from 'crypto'
import { VerificationTokenType } from '@/generated/client'
import { prisma } from '@/lib/prisma'
import { getMailer } from '@/lib/email'

const RESEND_COOLDOWN_MS = 120 * 1000

const TOKEN_TTL_MS: Record<VerificationTokenType, number> = {
  EMAIL_VERIFY: 24 * 60 * 60 * 1000,
  EMAIL_CHANGE: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 20 * 60 * 1000,
}

const LINK_PATH: Record<VerificationTokenType, string> = {
  EMAIL_VERIFY: '/api/verify-email',
  EMAIL_CHANGE: '/api/verify-email',
  PASSWORD_RESET: '/reset-password',
}

function sendTokenEmail(type: VerificationTokenType, to: string, url: string) {
  const mailer = getMailer()
  const expiresInMinutes = TOKEN_TTL_MS[type] / 60_000

  switch (type) {
    case VerificationTokenType.EMAIL_VERIFY:
      return mailer.send('verifyEmail', { to, props: { verifyUrl: url, expiresInMinutes } })
    case VerificationTokenType.EMAIL_CHANGE:
      return mailer.send('verifyEmailChange', { to, props: { verifyUrl: url, expiresInMinutes } })
    case VerificationTokenType.PASSWORD_RESET:
      return mailer.send('resetPassword', { to, props: { resetUrl: url, expiresInMinutes } })
  }
}

/**
 * Issues a single-use token of `type` for `email` and emails the link; once
 * sent, it replaces any earlier token. Returns false without sending when the
 * previous token is less than 2 minutes old. Throws when the email can't be
 * sent, leaving the earlier link valid.
 */
export async function sendVerificationEmail(
  email: string,
  type: VerificationTokenType = VerificationTokenType.EMAIL_VERIFY,
): Promise<boolean> {
  const existing = await prisma.verificationToken.findFirst({ where: { identifier: email, type } })
  if (existing && Date.now() - existing.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return false
  }

  const token = crypto.randomBytes(32).toString('hex')

  await prisma.verificationToken.create({
    data: { identifier: email, token, type, expires: new Date(Date.now() + TOKEN_TTL_MS[type]) },
  })

  const verifyUrl = `${process.env.APP_URL}${LINK_PATH[type]}?token=${token}`

  try {
    await sendTokenEmail(type, email, verifyUrl)
  } catch (error) {
    // A token nobody received would still start the resend cooldown.
    await prisma.verificationToken.delete({ where: { token } })
    throw error
  }

  await prisma.verificationToken.deleteMany({ where: { identifier: email, type, token: { not: token } } })

  return true
}
