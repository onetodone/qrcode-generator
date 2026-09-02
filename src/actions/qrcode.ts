'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/client'
import { qrCodeFormSchema, type QrCodeFormInput } from '@/schemas/qrcode'
import { generateUrlHash, normalizeLeadsTo } from '@/lib/qrcode'
import { firstZodError, type FormState } from '@/lib/forms'
import { getSessionUserId } from '@/lib/auth-guard'

const MAX_HASH_ATTEMPTS = 5

const NOT_SIGNED_IN = 'You must be signed in.'

function parseQrCodeForm(formData: FormData): { data: QrCodeFormInput } | { error: string } {
  const parsed = qrCodeFormSchema.safeParse({
    leadsTo: formData.get('leadsTo'),
    note: formData.get('note'),
    shape: formData.get('shape') ?? undefined,
    fgColor: formData.get('fgColor') ?? undefined,
    bgColor: formData.get('bgColor') ?? undefined,
  })
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) }
  }

  const leadsTo = normalizeLeadsTo(parsed.data.leadsTo)
  if (!leadsTo) {
    return { error: 'Endpoint must be a valid URL, phone number, or email address.' }
  }

  return { data: { ...parsed.data, leadsTo } }
}

export async function createQrCodeAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const userId = await getSessionUserId()
  if (!userId) return { error: NOT_SIGNED_IN }

  const result = parseQrCodeForm(formData)
  if ('error' in result) return { error: result.error }
  const { leadsTo, note, shape, fgColor, bgColor } = result.data

  for (let attempt = 1; attempt <= MAX_HASH_ATTEMPTS; attempt++) {
    try {
      await prisma.qrCode.create({
        data: { userId, urlHash: generateUrlHash(), note, leadsTo, shape, fgColor, bgColor },
      })
      break
    } catch (error) {
      const isHashCollision = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
      if (isHashCollision && attempt < MAX_HASH_ATTEMPTS) continue
      throw error
    }
  }

  revalidatePath('/')
  return { success: true }
}

export async function updateQrCodeAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const userId = await getSessionUserId()
  if (!userId) return { error: NOT_SIGNED_IN }

  const id = formData.get('id')
  if (typeof id !== 'string' || !id) {
    return { error: 'Invalid request.' }
  }

  const result = parseQrCodeForm(formData)
  if ('error' in result) return { error: result.error }
  const { leadsTo, note, shape, fgColor, bgColor } = result.data

  // urlHash is intentionally left untouched — the QR image itself never changes.
  const { count } = await prisma.qrCode.updateMany({
    where: { id, userId },
    data: { leadsTo, note, shape, fgColor, bgColor },
  })

  if (count === 0) {
    return { error: 'QR code not found.' }
  }

  revalidatePath('/')
  return { success: true }
}

export async function deleteQrCodeAction(id: string): Promise<void> {
  const userId = await getSessionUserId()
  if (!userId) {
    throw new Error('Unauthorized')
  }

  await prisma.qrCode.deleteMany({ where: { id, userId } })

  revalidatePath('/')
}
