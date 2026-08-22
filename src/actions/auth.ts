'use server'

import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'
import { EmailNotVerifiedSignin, signIn, signOut } from '@/auth'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/verification'
import { emailSchema, loginSchema, registerSchema } from '@/schemas/auth'
import bcrypt from 'bcryptjs'

export type AuthFormState = { error?: string } | undefined
export type ResendVerificationFormState = { error?: string; success?: boolean } | undefined

export async function loginAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
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
    // `signIn` throws Next.js's internal redirect signal on success — rethrow it.
    throw error
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' })
}

export async function registerAction(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  })
  if (existing) {
    return { error: 'An account with this email already exists.' }
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10)

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashedPassword,
    },
  })

  await sendVerificationEmail(parsed.data.email)

  redirect(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`)
}

export async function resendVerificationEmailAction(
  _prevState: ResendVerificationFormState,
  formData: FormData,
): Promise<ResendVerificationFormState> {
  const parsed = emailSchema.safeParse(formData.get('email'))
  if (!parsed.success) {
    return { error: 'Invalid email address.' }
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data } })
  if (user && !user.emailVerified) {
    const sent = await sendVerificationEmail(parsed.data)
    if (!sent) {
      return { error: 'A confirmation email was already sent recently. Please wait a bit before requesting another.' }
    }
  }

  return { success: true }
}
