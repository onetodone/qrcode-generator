'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/client'
import { qrCodeFormSchema } from '@/schemas/qrcode'
import { generateUrlHash, normalizeLeadsTo } from '@/lib/qrcode'

export type QrCodeFormState = { error?: string; success?: boolean } | undefined

const MAX_HASH_ATTEMPTS = 5

export async function createQrCodeAction(_prevState: QrCodeFormState, formData: FormData): Promise<QrCodeFormState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'You must be signed in.' }
  }

  const parsed = qrCodeFormSchema.safeParse({
    leadsTo: formData.get('leadsTo'),
    location: formData.get('location'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const leadsTo = normalizeLeadsTo(parsed.data.leadsTo)
  if (!leadsTo) {
    return { error: 'Endpoint must be a valid URL, phone number, or email address.' }
  }

  for (let attempt = 1; attempt <= MAX_HASH_ATTEMPTS; attempt++) {
    try {
      await prisma.qrCode.create({
        data: {
          userId: session.user.id,
          urlHash: generateUrlHash(),
          location: parsed.data.location,
          leadsTo,
        },
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

export async function updateQrCodeAction(_prevState: QrCodeFormState, formData: FormData): Promise<QrCodeFormState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'You must be signed in.' }
  }

  const id = formData.get('id')
  if (typeof id !== 'string' || !id) {
    return { error: 'Invalid request.' }
  }

  const parsed = qrCodeFormSchema.safeParse({
    leadsTo: formData.get('leadsTo'),
    location: formData.get('location'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const leadsTo = normalizeLeadsTo(parsed.data.leadsTo)
  if (!leadsTo) {
    return { error: 'Endpoint must be a valid URL, phone number, or email address.' }
  }

  // urlHash is intentionally left untouched — the QR image itself never changes.
  const { count } = await prisma.qrCode.updateMany({
    where: { id, userId: session.user.id },
    data: { leadsTo, location: parsed.data.location },
  })

  if (count === 0) {
    return { error: 'QR code not found.' }
  }

  revalidatePath('/')
  return { success: true }
}

export async function deleteQrCodeAction(id: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  await prisma.qrCode.deleteMany({
    where: { id, userId: session.user.id },
  })

  revalidatePath('/')
}
