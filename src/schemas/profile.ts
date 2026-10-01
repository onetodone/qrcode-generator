import * as z from 'zod'
import { confirmPasswordField, passwordField, passwordsMatch, passwordsMatchError } from '@/schemas/password'

/** Profile form: name and email, plus the current password, which a change of email requires. */
export const updateProfileSchema = z.object({
  name: z.string().min(2, { error: 'Name must be at least 2 characters.' }).max(100).trim(),
  email: z.email({ error: 'Please enter a valid email address.' }).trim(),
  currentPassword: z.string().optional(),
})

/** Change-password form: current password plus the new one entered twice. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: 'Current password is required.' }),
    newPassword: passwordField,
    confirmPassword: confirmPasswordField,
  })
  .refine(passwordsMatch, passwordsMatchError)

/** Parsed `updateProfileSchema` input. */
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
/** Parsed `changePasswordSchema` input. */
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
