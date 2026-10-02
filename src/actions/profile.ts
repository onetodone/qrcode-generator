'use server'

import { revalidatePath } from 'next/cache'
import { AuthError } from 'next-auth'
import { signIn, signOut, unstable_update } from '@/auth'
import { VerificationTokenType } from '@/generated/client'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/verification'
import { sendEmailChangeRequestedNotice } from '@/lib/account-emails'
import { afterResponse } from '@/lib/after-response'
import { changePasswordSchema, deleteAccountSchema, updateProfileSchema } from '@/schemas/profile'
import { firstZodError, type FormState } from '@/lib/forms'
import { hashPassword, verifyPassword } from '@/lib/password'
import { rateLimit, refundRateLimit, tooManyAttemptsMessage } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request'
import { getSessionUserId } from '@/lib/auth-guard'
import { invalidateRedirect } from '@/lib/redirect-cache'
import { logger } from '@/lib/logger'

const NOT_SIGNED_IN = 'You must be signed in.'

const CURRENT_PASSWORD_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 }

/**
 * Checks the signed-in user's current password. Failed checks are limited per
 * user, and the profile and change-password forms share the limit, so a
 * session alone can't be used to guess the password. A correct password
 * doesn't count. Returns the error to show, or `null` when it matches.
 */
async function checkCurrentPassword(userId: string, password: string, hash: string | null): Promise<string | null> {
  const key = `current-password:${userId}`
  const attempt = rateLimit(key, CURRENT_PASSWORD_LIMIT)
  if (!attempt.ok) {
    refundRateLimit(key)
    return tooManyAttemptsMessage(attempt.retryAfterMs)
  }

  if (!hash || !(await verifyPassword(password, hash))) {
    return 'Current password is incorrect.'
  }

  refundRateLimit(key)
  return null
}

/**
 * Updates the signed-in user's name. A new email address needs the current
 * password; it is stored as pending and replaces the current one only after
 * its confirmation link is followed, and the current address is told about
 * the request. Nothing is saved when the link can't be emailed.
 */
export async function updateProfileAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const userId = await getSessionUserId()
  if (!userId) return { error: NOT_SIGNED_IN }

  const parsed = updateProfileSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    currentPassword: formData.get('currentPassword') ?? undefined,
  })

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) }
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, pendingEmail: true, password: true },
  })
  if (!currentUser) return { error: NOT_SIGNED_IN }

  const emailChanged = currentUser.email !== parsed.data.email
  // Saving the pending address again keeps the request as it is.
  const newEmailRequested = emailChanged && currentUser.pendingEmail !== parsed.data.email

  let noticeDue = false
  if (newEmailRequested) {
    if (!parsed.data.currentPassword) {
      return { error: 'Enter your current password to change your email.' }
    }
    // Checked before the lookup below, so probing addresses takes the password.
    const passwordError = await checkCurrentPassword(userId, parsed.data.currentPassword, currentUser.password)
    if (passwordError) return { error: passwordError }

    const existing = await prisma.user.findFirst({
      where: {
        id: { not: userId },
        OR: [{ email: parsed.data.email }, { pendingEmail: parsed.data.email }],
      },
    })
    if (existing) {
      return { error: 'An account with this email already exists.' }
    }

    try {
      noticeDue = await sendVerificationEmail(parsed.data.email, VerificationTokenType.EMAIL_CHANGE)
    } catch (error) {
      logger.error('profile.email_change_email_failed', { error })
      return {
        error:
          "We couldn't send the confirmation email to the new address. Nothing was saved; please try again in a few minutes.",
      }
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: parsed.data.name,
      // The real `email`/`emailVerified` stay untouched until the new
      // address is confirmed, so a typo here can't lock the user out.
      // Saving the current email again cancels a pending change.
      ...(emailChanged ? { pendingEmail: parsed.data.email } : currentUser.pendingEmail ? { pendingEmail: null } : {}),
    },
  })

  if (currentUser.pendingEmail && currentUser.pendingEmail !== parsed.data.email) {
    await prisma.verificationToken.deleteMany({
      where: { identifier: currentUser.pendingEmail, type: VerificationTokenType.EMAIL_CHANGE },
    })
  }

  if (noticeDue) {
    const newEmail = parsed.data.email
    const ip = await getClientIp()
    afterResponse('profile.email_change_notice_failed', () => sendEmailChangeRequestedNotice(currentUser, newEmail, ip))
  }

  // The `jwt` callback reads the name from the database.
  await unstable_update({})

  revalidatePath('/profile')
  revalidatePath('/qrcodes')
  return { success: true }
}

/**
 * Changes the signed-in user's password after checking the current one. Other
 * sessions are revoked; the current one is issued again with the new password
 * and stays signed in.
 */
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

  const passwordError = await checkCurrentPassword(userId, parsed.data.currentPassword, user.password)
  if (passwordError) {
    return { error: passwordError }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { password: await hashPassword(parsed.data.newPassword), passwordChangedAt: new Date() },
  })

  // A session update can't renew a revoked session, so sign in again.
  try {
    await signIn('credentials', { email: user.email, password: parsed.data.newPassword, redirect: false })
  } catch (error) {
    if (!(error instanceof AuthError)) throw error
    // The password is saved; this session ends at its next check.
    logger.warn('profile.session_reissue_failed', { error })
  }

  return { success: true }
}

/**
 * Deletes the signed-in user's account after checking the current password.
 * Its QR codes go with it, so their links return 404, and so do pending
 * confirmation and reset links. Signs out and redirects to `/account-deleted`.
 * Other sessions of the account end at their next check.
 */
export async function deleteAccountAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const userId = await getSessionUserId()
  if (!userId) return { error: NOT_SIGNED_IN }

  const parsed = deleteAccountSchema.safeParse({ currentPassword: formData.get('currentPassword') })
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, pendingEmail: true, password: true, qrCodes: { select: { urlHash: true } } },
  })
  if (!user) return { error: NOT_SIGNED_IN }

  const passwordError = await checkCurrentPassword(userId, parsed.data.currentPassword, user.password)
  if (passwordError) return { error: passwordError }

  const identifiers = user.pendingEmail ? [user.email, user.pendingEmail] : [user.email]
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier: { in: identifiers } } }),
    prisma.user.delete({ where: { id: userId } }),
  ])
  for (const { urlHash } of user.qrCodes) {
    invalidateRedirect(urlHash)
  }
  logger.info('account.deleted', { userId, qrCodes: user.qrCodes.length })

  await signOut({ redirectTo: '/account-deleted' })
  return { success: true }
}
