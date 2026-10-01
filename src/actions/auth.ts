'use server'

import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'
import {
  clearLoginAttempts,
  ConfirmationEmailFailedSignin,
  EmailNotVerifiedSignin,
  RateLimitedSignin,
  signIn,
  signOut,
  VerificationTokenInvalidSignin,
} from '@/auth'
import { VerificationTokenType } from '@/generated/client'
import { prisma } from '@/lib/prisma'
import { RESEND_COOLDOWN_MS, sendVerificationEmail } from '@/lib/verification'
import { sendAccountExistsEmail } from '@/lib/account-emails'
import { afterResponse } from '@/lib/after-response'
import { storeHandoffCookie } from '@/lib/handoff-cookies'
import {
  confirmAccountSchema,
  confirmEmailSchema,
  emailSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@/schemas/auth'
import { rateLimit, refundRateLimit, tooManyAttemptsMessage } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request'
import { firstZodError, type FormState } from '@/lib/forms'
import { hashPassword } from '@/lib/password'
import { logger } from '@/lib/logger'

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000
const ONE_HOUR_MS = 60 * 60 * 1000

const CONFIRMATION_EMAIL_FAILED = "We couldn't send the confirmation email. Please try again in a few minutes."

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
 * Sends the one email a registration produces: the confirmation link to a new
 * or unconfirmed account, or a note to a confirmed one that it already exists.
 * Throws when the email can't be sent; a just-created account is removed again.
 */
async function sendRegistrationEmail(name: string, email: string): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing?.emailVerified) {
    await sendAccountExistsEmail(existing)
    return
  }

  // The resend cooldown is ignored: skipping the email would make this path
  // answer faster than the others. `registerAction` limits sends per address.
  if (existing) {
    await sendVerificationEmail(email, VerificationTokenType.EMAIL_VERIFY, { ignoreCooldown: true })
    await prisma.user.update({ where: { id: existing.id }, data: { name } })
    return
  }

  const user = await prisma.user.create({ data: { name, email } })
  try {
    await sendVerificationEmail(email, VerificationTokenType.EMAIL_VERIFY, { ignoreCooldown: true })
  } catch (error) {
    await prisma.user.delete({ where: { id: user.id } })
    throw error
  }
}

/**
 * Starts a registration and redirects to `/verify-email`. Every address gets
 * the same answer and one email, so the form can't be used to probe for
 * accounts; the password is chosen when the address is confirmed. When the
 * email can't be sent, the form shows an error. Rate-limited per IP and per
 * address.
 */
export async function registerAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const register = rateLimit(`register:${await getClientIp()}`, { limit: 5, windowMs: ONE_HOUR_MS })
  if (!register.ok) {
    return { error: tooManyAttemptsMessage(register.retryAfterMs) }
  }

  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  })

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) }
  }

  const { name, email } = parsed.data
  const addressKey = `register:email:${email.toLowerCase()}`
  const address = rateLimit(addressKey, { limit: 1, windowMs: RESEND_COOLDOWN_MS })
  if (!address.ok) {
    return { error: tooManyAttemptsMessage(address.retryAfterMs) }
  }

  try {
    await sendRegistrationEmail(name, email)
  } catch (error) {
    logger.error('auth.register_email_failed', { error })
    refundRateLimit(addressKey)
    return { error: "We couldn't send the email. Please try again in a few minutes." }
  }

  await storeHandoffCookie('pendingEmail', email)
  redirect('/verify-email')
}

/**
 * Confirms an email address from the `/confirm-email` page: a new account's
 * address together with the password it chooses, or the new address of an
 * email change. Signs in and redirects to `/qrcodes`. When the link turned
 * invalid or expired, the page is loaded again and explains it. Rate-limited
 * per IP.
 */
export async function confirmEmailAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const confirm = rateLimit(`confirm-email:${await getClientIp()}`, { limit: 10, windowMs: FIFTEEN_MINUTES_MS })
  if (!confirm.ok) {
    return { error: tooManyAttemptsMessage(confirm.retryAfterMs) }
  }

  const token = formData.get('token')
  const parsed = formData.has('newPassword')
    ? confirmAccountSchema.safeParse({
        token,
        newPassword: formData.get('newPassword'),
        confirmPassword: formData.get('confirmPassword'),
      })
    : confirmEmailSchema.safeParse({ token })
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) }
  }

  try {
    await signIn('credentials', {
      verificationToken: parsed.data.token,
      ...('newPassword' in parsed.data ? { password: parsed.data.newPassword } : {}),
      redirectTo: '/qrcodes',
    })
  } catch (error) {
    if (error instanceof VerificationTokenInvalidSignin) {
      redirect('/confirm-email')
    }
    throw error
  }
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
 * the account, lifts its failed sign-in limit and confirms its email if it
 * wasn't yet. Does not sign in. Rate-limited per IP.
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
    data: {
      password: await hashPassword(parsed.data.newPassword),
      passwordChangedAt: new Date(),
      // The link proves the mailbox, and its holder chose the password.
      emailVerified: user.emailVerified ?? new Date(),
    },
  })
  clearLoginAttempts(user.email)

  return { success: true }
}
