'use server'

import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'
import { EmailNotVerifiedSignin, signIn, signOut } from '@/auth'
import { VerificationTokenType } from '@/generated/client'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/verification'
import { emailSchema, loginSchema, registerSchema, resetPasswordSchema } from '@/schemas/auth'
import { rateLimit, tooManyAttemptsMessage } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request'
import { firstZodError, type FormState } from '@/lib/forms'
import { hashPassword } from '@/lib/password'

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000
const ONE_HOUR_MS = 60 * 60 * 1000

export async function loginAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const login = rateLimit(`login:${await getClientIp()}`, { limit: 10, windowMs: FIFTEEN_MINUTES_MS })
  if (!login.ok) {
    return { error: tooManyAttemptsMessage(login.retryAfterMs) }
  }

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
      redirectTo: '/',
    })
  } catch (error) {
    if (error instanceof EmailNotVerifiedSignin) {
      redirect(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`)
    }
    if (error instanceof AuthError) {
      return { error: 'Invalid email or password.' }
    }
    throw error
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' })
}

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

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: await hashPassword(parsed.data.password),
    },
  })

  await sendVerificationEmail(parsed.data.email)

  redirect(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`)
}

export async function resendVerificationEmailAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const resend = rateLimit(`resend-verification:${await getClientIp()}`, { limit: 5, windowMs: FIFTEEN_MINUTES_MS })
  if (!resend.ok) {
    return { error: tooManyAttemptsMessage(resend.retryAfterMs) }
  }

  const parsed = emailSchema.safeParse(formData.get('email'))
  if (!parsed.success) {
    return { error: 'Invalid email address.' }
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: parsed.data }, { pendingEmail: parsed.data }] },
  })

  const type =
    user?.pendingEmail === parsed.data ? VerificationTokenType.EMAIL_CHANGE : VerificationTokenType.EMAIL_VERIFY
  const shouldSend = type === VerificationTokenType.EMAIL_CHANGE ? Boolean(user) : Boolean(user && !user.emailVerified)

  if (shouldSend) {
    const sent = await sendVerificationEmail(parsed.data, type)
    if (!sent) {
      return { error: 'A confirmation email was already sent recently. Please wait a bit before requesting another.' }
    }
  }

  return { success: true }
}

export async function forgotPasswordAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const forgot = rateLimit(`forgot-password:${await getClientIp()}`, { limit: 5, windowMs: FIFTEEN_MINUTES_MS })
  if (!forgot.ok) {
    return { error: tooManyAttemptsMessage(forgot.retryAfterMs) }
  }

  const parsed = emailSchema.safeParse(formData.get('email'))
  if (!parsed.success) {
    return { error: 'Please enter a valid email address.' }
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data } })
  if (user) {
    await sendVerificationEmail(parsed.data, VerificationTokenType.PASSWORD_RESET)
  }

  // Always the same response whether or not the account exists (or was just
  // sent one seconds ago) — anything else would let an attacker use this
  // form to check which addresses have accounts.
  return { success: true }
}

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

  return { success: true }
}
