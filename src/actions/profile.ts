'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { auth, unstable_update } from '@/auth'
import { VerificationTokenType } from '@/generated/client'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/verification'
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

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, pendingEmail: true },
  })
  const emailChanged = currentUser?.email !== parsed.data.email

  if (emailChanged) {
    const existing = await prisma.user.findFirst({
      where: {
        id: { not: session.user.id },
        OR: [{ email: parsed.data.email }, { pendingEmail: parsed.data.email }],
      },
    })
    if (existing) {
      return { error: 'An account with this email already exists.' }
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      // The real `email`/`emailVerified` stay untouched until the new
      // address is confirmed, so a typo here can't lock the user out.
      // Saving the current email again cancels a pending change.
      ...(emailChanged ? { pendingEmail: parsed.data.email } : currentUser?.pendingEmail ? { pendingEmail: null } : {}),
    },
  })

  if (emailChanged) {
    await sendVerificationEmail(parsed.data.email, VerificationTokenType.EMAIL_CHANGE)
  }

  if (currentUser?.pendingEmail && currentUser.pendingEmail !== parsed.data.email) {
    await prisma.verificationToken.deleteMany({
      where: { identifier: currentUser.pendingEmail, type: VerificationTokenType.EMAIL_CHANGE },
    })
  }

  await unstable_update({
    user: { name: parsed.data.name },
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
    data: { password: hashedPassword, passwordChangedAt: new Date() },
  })

  await unstable_update({ user: {} })

  return { success: true }
}
