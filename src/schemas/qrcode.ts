import * as z from 'zod'

/** Module shapes a QR code can be drawn with; mirrors the `QrShape` database enum. */
export const QR_SHAPES = ['SQUARE', 'ROUNDED', 'DOTS'] as const
/** One of `QR_SHAPES`. */
export type QrShapeValue = (typeof QR_SHAPES)[number]

/** Display labels for `QR_SHAPES`. */
export const QR_SHAPE_LABELS: Record<QrShapeValue, string> = {
  SQUARE: 'Square',
  ROUNDED: 'Rounded',
  DOTS: 'Dots',
}

/** Default module color. */
export const DEFAULT_FG_COLOR = '#000000'
/** Default background color. */
export const DEFAULT_BG_COLOR = '#ffffff'

const hexColor = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/, { error: 'Colors must be hex values like #1a2b3c.' })

/** QR code form: endpoint, note and design. Rejects identical foreground and background colors. */
export const qrCodeFormSchema = z
  .object({
    leadsTo: z
      .string()
      .min(1, { error: 'Endpoint is required.' })
      .max(200, { error: 'Endpoint must be at most 200 characters.' })
      .trim(),
    note: z.string().max(200, { error: 'Note must be at most 200 characters.' }).trim(),
    shape: z.enum(QR_SHAPES).default('SQUARE'),
    fgColor: hexColor.default(DEFAULT_FG_COLOR),
    bgColor: hexColor.default(DEFAULT_BG_COLOR),
  })
  .refine((data) => data.fgColor !== data.bgColor, {
    error: 'Foreground and background colors must be different.',
    path: ['bgColor'],
  })

/** Parsed `qrCodeFormSchema` input. */
export type QrCodeFormInput = z.infer<typeof qrCodeFormSchema>
