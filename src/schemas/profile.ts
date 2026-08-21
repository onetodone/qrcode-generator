import * as z from 'zod'

export const updateProfileSchema = z.object({
  name: z.string().min(2, { error: 'Name must be at least 2 characters.' }).max(100).trim(),
  email: z.email({ error: 'Please enter a valid email address.' }).trim(),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: 'Current password is required.' }),
    // bcrypt silently truncates at 72 bytes, so reject longer input up front.
    newPassword: z
      .string()
      .min(8, { error: 'New password must be at least 8 characters.' })
      .max(72, { error: 'New password must be at most 72 characters.' }),
    confirmPassword: z.string().min(1, { error: 'Please repeat the new password.' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: 'New passwords do not match.',
    path: ['confirmPassword'],
  })

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
