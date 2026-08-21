import * as z from 'zod'

export const qrCodeFormSchema = z.object({
  leadsTo: z
    .string()
    .min(1, { error: 'Endpoint is required.' })
    .max(150, { error: 'Endpoint must be at most 150 characters.' })
    .trim(),
  location: z
    .string()
    .min(1, { error: 'Distribution point is required.' })
    .max(50, { error: 'Distribution point must be at most 50 characters.' })
    .trim(),
})

export type QrCodeFormInput = z.infer<typeof qrCodeFormSchema>
