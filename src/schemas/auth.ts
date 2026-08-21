import * as z from 'zod'

export const registerSchema = z.object({
  name: z.string().min(2, { error: 'Name must be at least 2 characters.' }).max(100).trim(),
  email: z.email({ error: 'Please enter a valid email address.' }).trim(),
  // bcrypt silently truncates at 72 bytes, so reject longer input up front.
  password: z
    .string()
    .min(8, { error: 'Password must be at least 8 characters.' })
    .max(72, { error: 'Password must be at most 72 characters.' }),
})

export const loginSchema = z.object({
  email: z.email({ error: 'Please enter a valid email address.' }).trim(),
  password: z.string().min(1, { error: 'Password is required.' }),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
