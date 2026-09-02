import * as z from 'zod'
import { confirmPasswordField, passwordField, passwordsMatch, passwordsMatchError } from '@/schemas/password'

export const updateProfileSchema = z.object({
  name: z.string().min(2, { error: 'Name must be at least 2 characters.' }).max(100).trim(),
  email: z.email({ error: 'Please enter a valid email address.' }).trim(),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: 'Current password is required.' }),
    newPassword: passwordField,
    confirmPassword: confirmPasswordField,
  })
  .refine(passwordsMatch, passwordsMatchError)

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
