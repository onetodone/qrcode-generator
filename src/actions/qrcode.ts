'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { Prisma, QrDisabledReason } from '@/generated/client'
import { qrCodeFormSchema, type QrCodeFormInput } from '@/schemas/qrcode'
import {
  generateUrlHash,
  hasIpAddressHost,
  hasUrlCredentials,
  isOwnRedirectLink,
  isUrlShortener,
  normalizeLeadsTo,
} from '@/lib/qrcode'
import { firstZodError, type FormState } from '@/lib/forms'
import { getSessionUserId } from '@/lib/auth-guard'
import { invalidateRedirect } from '@/lib/redirect-cache'
import { getAppHostnames } from '@/lib/request'
import { rateLimit, tooManyAttemptsMessage } from '@/lib/rate-limit'
import { checkDestination } from '@/lib/destination-safety'
import { logger } from '@/lib/logger'

const MAX_HASH_ATTEMPTS = 5
const HOUR_MS = 60 * 60_000
const DAILY_CREATE_LIMIT = 10
// Bounds Safe Browsing lookups per user; creating is capped separately.
const SAVE_RATE_LIMIT = { limit: 30, windowMs: HOUR_MS }

const NOT_SIGNED_IN = 'You must be signed in.'
const ACCOUNT_SUSPENDED = 'This account has been suspended. Contact support.'
const UNSAFE_DESTINATION = 'This destination is flagged as unsafe, so it can’t be used.'

async function isAccountSuspended(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { suspendedAt: true } })
  return user?.suspendedAt !== null && user?.suspendedAt !== undefined
}

function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
}

async function parseQrCodeForm(formData: FormData): Promise<{ data: QrCodeFormInput } | { error: string }> {
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
  if (hasUrlCredentials(leadsTo)) {
    return { error: 'Endpoint can’t contain a username or password (user@host).' }
  }
  if (hasIpAddressHost(leadsTo)) {
    return { error: 'Use a domain name, not an IP address.' }
  }
  if (isUrlShortener(leadsTo)) {
    return { error: 'Links through URL shorteners aren’t allowed. Use the final address.' }
  }
  if (isOwnRedirectLink(leadsTo, await getAppHostnames())) {
    return { error: 'Endpoint can’t be the tracking link of another QR code.' }
  }

  return { data: { ...parsed.data, leadsTo } }
}

function saveRateLimitError(userId: string): string | null {
  const limited = rateLimit(`qr-save:${userId}`, SAVE_RATE_LIMIT)
  return limited.ok ? null : tooManyAttemptsMessage(limited.retryAfterMs)
}

// Counted in the database rather than the in-memory limiter, so the cap holds
// across serverless instances.
async function dailyCreateLimitError(userId: string): Promise<string | null> {
  const now = Date.now()
  const recent = await prisma.qrCode.findMany({
    where: { userId, createdAt: { gt: new Date(now - 24 * HOUR_MS) } },
    select: { createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: DAILY_CREATE_LIMIT,
  })
  const oldest = recent.at(-1)
  if (recent.length < DAILY_CREATE_LIMIT || !oldest) return null

  const hours = Math.max(1, Math.ceil((oldest.createdAt.getTime() + 24 * HOUR_MS - now) / HOUR_MS))
  return `You can create up to ${DAILY_CREATE_LIMIT} QR codes per 24 hours. Please try again in about ${hours} hour${hours === 1 ? '' : 's'}.`
}

/** Creates a QR code for the signed-in user with a unique redirect hash. */
export async function createQrCodeAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const userId = await getSessionUserId()
  if (!userId) return { error: NOT_SIGNED_IN }
  if (await isAccountSuspended(userId)) return { error: ACCOUNT_SUSPENDED }

  const rateLimitError = saveRateLimitError(userId)
  if (rateLimitError) return { error: rateLimitError }

  const result = await parseQrCodeForm(formData)
  if ('error' in result) return { error: result.error }
  const { leadsTo, note, shape, fgColor, bgColor } = result.data

  const limitError = await dailyCreateLimitError(userId)
  if (limitError) return { error: limitError }

  const verdict = await checkDestination(leadsTo)
  if (verdict.status === 'unsafe') {
    logger.warn('qr.unsafe_destination_rejected', { userId, threatTypes: verdict.threatTypes })
    return { error: UNSAFE_DESTINATION }
  }
  const destinationCheckedAt = verdict.status === 'safe' ? new Date() : null

  for (let attempt = 1; attempt <= MAX_HASH_ATTEMPTS; attempt++) {
    try {
      await prisma.qrCode.create({
        data: { userId, urlHash: generateUrlHash(), note, leadsTo, shape, fgColor, bgColor, destinationCheckedAt },
      })
      break
    } catch (error) {
      const isHashCollision = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
      if (isHashCollision && attempt < MAX_HASH_ATTEMPTS) continue
      throw error
    }
  }

  revalidatePath('/qrcodes')
  return { success: true }
}

/**
 * Updates a QR code's endpoint, note and design. The redirect hash never
 * changes, so printed codes keep resolving. A new endpoint, or any save of a
 * code disabled for an unsafe destination, is checked with Safe Browsing; a
 * clean result enables such a code again. Manual disables stay.
 */
export async function updateQrCodeAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const userId = await getSessionUserId()
  if (!userId) return { error: NOT_SIGNED_IN }
  if (await isAccountSuspended(userId)) return { error: ACCOUNT_SUSPENDED }

  const id = formData.get('id')
  if (typeof id !== 'string' || !id) {
    return { error: 'Invalid request.' }
  }

  const rateLimitError = saveRateLimitError(userId)
  if (rateLimitError) return { error: rateLimitError }

  const result = await parseQrCodeForm(formData)
  if ('error' in result) return { error: result.error }
  const { leadsTo, note, shape, fgColor, bgColor } = result.data

  const current = await prisma.qrCode.findFirst({
    where: { id, userId },
    select: { leadsTo: true, disabledReason: true },
  })
  if (!current) return { error: 'QR code not found.' }

  const data: Prisma.QrCodeUpdateInput = { leadsTo, note, shape, fgColor, bgColor }
  const destinationChanged = leadsTo !== current.leadsTo
  const disabledAsUnsafe = current.disabledReason === QrDisabledReason.UNSAFE_DESTINATION

  if (destinationChanged || disabledAsUnsafe) {
    const verdict = await checkDestination(leadsTo)
    if (verdict.status === 'unsafe') {
      logger.warn('qr.unsafe_destination_rejected', { userId, threatTypes: verdict.threatTypes })
      return { error: UNSAFE_DESTINATION }
    }

    const checkedAt = verdict.status === 'safe' ? new Date() : null
    if (destinationChanged) {
      data.destinationSetAt = new Date()
      data.destinationCheckedAt = checkedAt
    } else if (checkedAt) {
      data.destinationCheckedAt = checkedAt
    }
    if (disabledAsUnsafe && checkedAt) {
      data.disabledAt = null
      data.disabledReason = null
    }
  }

  try {
    const { urlHash } = await prisma.qrCode.update({
      where: { id, userId },
      data,
      select: { urlHash: true },
    })
    invalidateRedirect(urlHash)
  } catch (error) {
    if (isRecordNotFound(error)) return { error: 'QR code not found.' }
    throw error
  }

  revalidatePath('/qrcodes')
  return { success: true }
}

/** Deletes one of the signed-in user's QR codes. Invalid, unknown or foreign ids are ignored. */
export async function deleteQrCodeAction(id: unknown): Promise<void> {
  const userId = await getSessionUserId()
  if (!userId) {
    throw new Error('Unauthorized')
  }
  if (typeof id !== 'string' || !id) return

  try {
    const { urlHash } = await prisma.qrCode.delete({ where: { id, userId }, select: { urlHash: true } })
    invalidateRedirect(urlHash)
  } catch (error) {
    if (!isRecordNotFound(error)) throw error
  }

  revalidatePath('/qrcodes')
}
