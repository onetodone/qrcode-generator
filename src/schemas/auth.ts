import * as z from 'zod'
import { confirmPasswordField, passwordField, passwordsMatch, passwordsMatchError } from '@/schemas/password'

/**
 * An email address, trimmed and lowercased: accounts, tokens and limits all
 * key on this one form, so letter case never makes a second address.
 */
export const emailField = z.email({ error: 'Please enter a valid email address.' }).trim().toLowerCase()

/** Registration form: name, email and agreement to the terms. The password is chosen when the email is confirmed. */
export const registerSchema = z.object({
  name: z.string().min(2, { error: 'Name must be at least 2 characters.' }).max(100).trim(),
  email: emailField,
  acceptTerms: z.literal('on', { error: 'Please agree to the Terms of Use to create an account.' }),
})

/** Sign-in form: email and password. */
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, { error: 'Password is required.' }),
})

/** A single email address, trimmed and lowercased. */
export const emailSchema = emailField

/** Reset-password form: token plus the new password entered twice. */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, { error: 'Missing reset token.' }),
    newPassword: passwordField,
    confirmPassword: confirmPasswordField,
  })
  .refine(passwordsMatch, passwordsMatchError)

const confirmationToken = z.string().min(1, { error: 'Missing confirmation token.' })

/** Email change confirmation: the token alone. */
export const confirmEmailSchema = z.object({ token: confirmationToken })

/** New account confirmation: token plus the chosen password entered twice. */
export const confirmAccountSchema = z
  .object({
    token: confirmationToken,
    newPassword: passwordField,
    confirmPassword: confirmPasswordField,
  })
  .refine(passwordsMatch, passwordsMatchError)

/** Parsed `registerSchema` input. */
export type RegisterInput = z.infer<typeof registerSchema>
/** Parsed `loginSchema` input. */
export type LoginInput = z.infer<typeof loginSchema>
/** Parsed `resetPasswordSchema` input. */
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
