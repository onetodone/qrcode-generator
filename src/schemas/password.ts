import * as z from 'zod'

/** Password of 8–72 characters. bcrypt silently truncates at 72 bytes, so longer input is rejected up front. */
export const passwordField = z
  .string()
  .min(8, { error: 'Password must be at least 8 characters.' })
  .max(72, { error: 'Password must be at most 72 characters.' })

/** Repeat of the new password, compared by `passwordsMatch`. */
export const confirmPasswordField = z.string().min(1, { error: 'Please repeat the new password.' })

/** `.refine` check shared by every "new password + repeat" schema. */
export function passwordsMatch(data: { newPassword?: string; confirmPassword?: string }): boolean {
  return data.newPassword === data.confirmPassword
}

/** `.refine` error for `passwordsMatch`, reported on `confirmPassword`. */
export const passwordsMatchError = {
  error: 'New passwords do not match.',
  path: ['confirmPassword'],
}
