import * as z from 'zod'
import { confirmPasswordField, passwordField, passwordsMatch, passwordsMatchError } from '@/schemas/password'

export const registerSchema = z.object({
  name: z.string().min(2, { error: 'Name must be at least 2 characters.' }).max(100).trim(),
  email: z.email({ error: 'Please enter a valid email address.' }).trim(),
  password: passwordField,
})

export const loginSchema = z.object({
  email: z.email({ error: 'Please enter a valid email address.' }).trim(),
  password: z.string().min(1, { error: 'Password is required.' }),
})

export const emailSchema = z.email({ error: 'Please enter a valid email address.' }).trim()

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, { error: 'Missing reset token.' }),
    newPassword: passwordField,
    confirmPassword: confirmPasswordField,
  })
  .refine(passwordsMatch, passwordsMatchError)

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
