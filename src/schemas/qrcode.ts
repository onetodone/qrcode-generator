import * as z from 'zod'

export const qrCodeFormSchema = z.object({
  leadsTo: z
    .string()
    .min(1, { error: 'Endpoint is required.' })
    .max(200, { error: 'Endpoint must be at most 200 characters.' })
    .trim(),
  note: z
    .string()
    .max(200, { error: 'Note must be at most 200 characters.' })
    .trim(),
})

export type QrCodeFormInput = z.infer<typeof qrCodeFormSchema>
