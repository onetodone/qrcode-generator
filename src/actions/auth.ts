'use server'

import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { AuthError } from 'next-auth'
import {
  clearLoginAttempts,
  ConfirmationEmailFailedSignin,
  EmailNotVerifiedSignin,
  RateLimitedSignin,
  signIn,
  signOut,
} from '@/auth'
import { VerificationTokenType } from '@/generated/client'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/verification'
import { storeHandoffCookie } from '@/lib/handoff-cookies'
import { emailSchema, loginSchema, registerSchema, resetPasswordSchema } from '@/schemas/auth'
import { rateLimit, tooManyAttemptsMessage } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request'
import { firstZodError, type FormState } from '@/lib/forms'
import { hashPassword } from '@/lib/password'
import { logger } from '@/lib/logger'

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000
const ONE_HOUR_MS = 60 * 60 * 1000

const CONFIRMATION_EMAIL_FAILED = "We couldn't send the confirmation email. Please try again in a few minutes."

/** Runs `task` after the response is sent; a failure is only logged. */
function afterResponse(event: string, task: () => Promise<unknown>): void {
  after(async () => {
    try {
      await task()
    } catch (error) {
      logger.error(event, { error })
    }
  })
}

/**
 * Signs in with email and password. An unconfirmed account gets a fresh
 * confirmation link and is redirected to `/verify-email`. Failed attempts are
 * rate-limited per IP and per email in `authorize()`.
 */
export async function loginAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: 'Please enter a valid email and password.' }
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/qrcodes',
    })
  } catch (error) {
    if (error instanceof EmailNotVerifiedSignin) {
      await storeHandoffCookie('pendingEmail', parsed.data.email)
      redirect('/verify-email')
    }
    if (error instanceof ConfirmationEmailFailedSignin) {
      return { error: CONFIRMATION_EMAIL_FAILED }
    }
    if (error instanceof RateLimitedSignin) {
      return { error: tooManyAttemptsMessage(error.retryAfterMs) }
    }
    if (error instanceof AuthError) {
      return { error: 'Invalid email or password.' }
    }
    throw error
  }
}

/** Signs out and redirects to `/login`. */
export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' })
}

/**
 * Creates an account and emails the confirmation link. Sign-in stays blocked
 * until the address is confirmed. When the email can't be sent, the account
 * is removed again and the form shows an error. Rate-limited per IP.
 */
export async function registerAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const register = rateLimit(`register:${await getClientIp()}`, { limit: 5, windowMs: ONE_HOUR_MS })
  if (!register.ok) {
    return { error: tooManyAttemptsMessage(register.retryAfterMs) }
  }

  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) }
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  })
  if (existing) {
    return { error: 'An account with this email already exists.' }
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: await hashPassword(parsed.data.password),
    },
  })

  try {
    await sendVerificationEmail(parsed.data.email)
  } catch (error) {
    logger.error('auth.register_email_failed', { error })
    // Otherwise the retry would hit "An account with this email already exists."
    await prisma.user.delete({ where: { id: user.id } })
    return { error: CONFIRMATION_EMAIL_FAILED }
  }

  await storeHandoffCookie('pendingEmail', parsed.data.email)
  redirect('/verify-email')
}

/**
 * Resends the confirmation link for an unconfirmed account or a pending email
 * change. The lookup and the email run after the response, so every address
 * gets the same answer in the same time and the form can't be used to probe
 * for accounts. Rate-limited per IP.
 */
export async function resendVerificationEmailAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const resend = rateLimit(`resend-verification:${await getClientIp()}`, { limit: 5, windowMs: FIFTEEN_MINUTES_MS })
  if (!resend.ok) {
    return { error: tooManyAttemptsMessage(resend.retryAfterMs) }
  }

  const parsed = emailSchema.safeParse(formData.get('email'))
  if (!parsed.success) {
    return { error: 'Invalid email address.' }
  }

  const email = parsed.data
  afterResponse('auth.resend_verification_failed', async () => {
    const user = await prisma.user.findFirst({
      where: { OR: [{ email }, { pendingEmail: email }] },
    })

    const type = user?.pendingEmail === email ? VerificationTokenType.EMAIL_CHANGE : VerificationTokenType.EMAIL_VERIFY
    const shouldSend =
      type === VerificationTokenType.EMAIL_CHANGE ? Boolean(user) : Boolean(user && !user.emailVerified)

    if (shouldSend) {
      await sendVerificationEmail(email, type)
    }
  })

  return { success: true }
}

/**
 * Emails a password reset link when the account exists. The lookup and the
 * email run after the response, so every address gets the same answer in the
 * same time and the form can't be used to probe for accounts. Rate-limited
 * per IP.
 */
export async function forgotPasswordAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const forgot = rateLimit(`forgot-password:${await getClientIp()}`, { limit: 5, windowMs: FIFTEEN_MINUTES_MS })
  if (!forgot.ok) {
    return { error: tooManyAttemptsMessage(forgot.retryAfterMs) }
  }

  const parsed = emailSchema.safeParse(formData.get('email'))
  if (!parsed.success) {
    return { error: 'Please enter a valid email address.' }
  }

  const email = parsed.data
  afterResponse('auth.password_reset_email_failed', async () => {
    const user = await prisma.user.findUnique({ where: { email } })
    if (user) {
      await sendVerificationEmail(email, VerificationTokenType.PASSWORD_RESET)
    }
  })

  return { success: true }
}

/**
 * Sets a new password from a reset token, revokes every existing session of
 * the account and lifts its failed sign-in limit. Does not sign in.
 * Rate-limited per IP.
 */
export async function resetPasswordAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const reset = rateLimit(`reset-password:${await getClientIp()}`, { limit: 10, windowMs: FIFTEEN_MINUTES_MS })
  if (!reset.ok) {
    return { error: tooManyAttemptsMessage(reset.retryAfterMs) }
  }

  const parsed = resetPasswordSchema.safeParse({
    token: formData.get('token'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) }
  }

  const record = await prisma.verificationToken.findUnique({ where: { token: parsed.data.token } })
  if (!record || record.type !== VerificationTokenType.PASSWORD_RESET) {
    return { error: 'This reset link is invalid or has already been used.' }
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token: parsed.data.token } })
    return { error: 'This reset link has expired. Request a new one.' }
  }

  // Single-use regardless of what happens next.
  await prisma.verificationToken.delete({ where: { token: parsed.data.token } })

  const user = await prisma.user.findUnique({ where: { email: record.identifier } })
  if (!user) {
    return { error: 'This reset link is invalid or has already been used.' }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hashPassword(parsed.data.newPassword), passwordChangedAt: new Date() },
  })
  clearLoginAttempts(user.email)

  return { success: true }
}
