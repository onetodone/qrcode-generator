import * as z from 'zod'

// bcrypt silently truncates at 72 bytes, so reject longer input up front.
export const passwordField = z
  .string()
  .min(8, { error: 'Password must be at least 8 characters.' })
  .max(72, { error: 'Password must be at most 72 characters.' })

export const confirmPasswordField = z.string().min(1, { error: 'Please repeat the new password.' })

/** `.refine` args shared by every "new password + repeat" schema. */
export function passwordsMatch(data: { newPassword?: string; confirmPassword?: string }): boolean {
  return data.newPassword === data.confirmPassword
}

export const passwordsMatchError = {
  error: 'New passwords do not match.',
  path: ['confirmPassword'],
}
