'use server'

import { revalidatePath } from 'next/cache'
import { unstable_update } from '@/auth'
import { VerificationTokenType } from '@/generated/client'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/verification'
import { changePasswordSchema, updateProfileSchema } from '@/schemas/profile'
import { firstZodError, type FormState } from '@/lib/forms'
import { hashPassword, verifyPassword } from '@/lib/password'
import { getSessionUserId } from '@/lib/auth-guard'

const NOT_SIGNED_IN = 'You must be signed in.'

export async function updateProfileAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const userId = await getSessionUserId()
  if (!userId) return { error: NOT_SIGNED_IN }

  const parsed = updateProfileSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  })

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) }
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, pendingEmail: true },
  })
  const emailChanged = currentUser?.email !== parsed.data.email

  if (emailChanged) {
    const existing = await prisma.user.findFirst({
      where: {
        id: { not: userId },
        OR: [{ email: parsed.data.email }, { pendingEmail: parsed.data.email }],
      },
    })
    if (existing) {
      return { error: 'An account with this email already exists.' }
    }
  }

  await prisma.user.update({
    where: { id: userId },
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

export async function changePasswordAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const userId = await getSessionUserId()
  if (!userId) return { error: NOT_SIGNED_IN }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) }
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return { error: 'User not found.' }
  }

  const currentPasswordValid = await verifyPassword(parsed.data.currentPassword, user.password)
  if (!currentPasswordValid) {
    return { error: 'Current password is incorrect.' }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { password: await hashPassword(parsed.data.newPassword), passwordChangedAt: new Date() },
  })

  await unstable_update({ user: {} })

  return { success: true }
}
