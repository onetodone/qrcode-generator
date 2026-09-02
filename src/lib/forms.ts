import type * as z from 'zod'

/** Shared shape for `useActionState` results across every form in the app. */
export type FormState = { error?: string; success?: boolean } | undefined

/** First validation message from a failed `safeParse`, with a generic fallback. */
export function firstZodError(error: z.ZodError, fallback = 'Invalid input.'): string {
  return error.issues[0]?.message ?? fallback
}
