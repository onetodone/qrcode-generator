'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { auth, unstable_update } from '@/auth'
import { prisma } from '@/lib/prisma'
import { changePasswordSchema, updateProfileSchema } from '@/schemas/profile'

export type ProfileFormState = { error?: string; success?: boolean } | undefined

export async function updateProfileAction(_prevState: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'You must be signed in.' }
  }

  const parsed = updateProfileSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing && existing.id !== session.user.id) {
    return { error: 'An account with this email already exists.' }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name, email: parsed.data.email },
  })

  // Keep the JWT session in sync, otherwise the old name/email would linger
  // in the session cookie until the next login.
  await unstable_update({
    user: { name: parsed.data.name, email: parsed.data.email },
  })

  revalidatePath('/profile')
  revalidatePath('/')
  return { success: true }
}

export async function changePasswordAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'You must be signed in.' }
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    return { error: 'User not found.' }
  }

  const currentPasswordValid = await bcrypt.compare(parsed.data.currentPassword, user.password)
  if (!currentPasswordValid) {
    return { error: 'Current password is incorrect.' }
  }

  const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 10)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashedPassword },
  })

  return { success: true }
}
