'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { Prisma, QrDisabledReason, QrKind } from '@/generated/client'
import { DAILY_CREATE_LIMIT, qrCodeFormSchema, type QrCodeFormInput } from '@/schemas/qrcode'
import {
  generateUrlHash,
  hasIpAddressHost,
  hasUrlCredentials,
  isOwnRedirectLink,
  isUrlShortener,
  normalizeLeadsTo,
} from '@/lib/qrcode'
import { firstZodError, type FormState } from '@/lib/forms'
import { accountSuspendedMessage, getSessionUserId } from '@/lib/auth-guard'
import { invalidateRedirect } from '@/lib/redirect-cache'
import { getAppHostnames } from '@/lib/request'
import { rateLimit, tooManyAttemptsMessage } from '@/lib/rate-limit'
import { checkDestination } from '@/lib/destination-safety'
import { logger } from '@/lib/logger'

const MAX_HASH_ATTEMPTS = 5
const HOUR_MS = 60 * 60_000
// Bounds Safe Browsing lookups per user; creating is capped separately.
const SAVE_RATE_LIMIT = { limit: 30, windowMs: HOUR_MS }

const NOT_SIGNED_IN = 'You must be signed in.'
const UNSAFE_DESTINATION = 'This destination is flagged as unsafe, so it can’t be used.'
const DIRECT_DESTINATION_LOCKED =
  'The endpoint of a direct QR code is part of its image, so it can’t be changed. Create a new QR code instead.'

async function isAccountSuspended(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { suspendedAt: true } })
  return Boolean(user?.suspendedAt)
}

function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
}

// With `lockedLeadsTo`, the endpoint must be submitted unchanged and isn't
// validated again: rules added later mustn't block edits to a code whose
// endpoint can't be changed anyway.
async function parseQrCodeForm(
  formData: FormData,
  lockedLeadsTo?: string,
): Promise<{ data: QrCodeFormInput } | { error: string }> {
  const parsed = qrCodeFormSchema.safeParse({
    kind: formData.get('kind') ?? undefined,
    leadsTo: formData.get('leadsTo'),
    note: formData.get('note'),
    shape: formData.get('shape') ?? undefined,
    fgColor: formData.get('fgColor') ?? undefined,
    bgColor: formData.get('bgColor') ?? undefined,
  })
  if (!parsed.success) {
    return { error: firstZodError(parsed.error) }
  }

  if (lockedLeadsTo !== undefined) {
    if (parsed.data.leadsTo !== lockedLeadsTo) return { error: DIRECT_DESTINATION_LOCKED }
    return { data: parsed.data }
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
async function dailyCreateLimitError(db: Pick<typeof prisma, 'qrCode'>, userId: string): Promise<string | null> {
  const now = Date.now()
  const recent = await db.qrCode.findMany({
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

// The per-user lock makes the count and the insert one step, so parallel
// requests can't all see room under the limit. A hash collision aborts the
// transaction, so each attempt runs in its own. Direct codes get no hash.
async function createWithinDailyLimit(
  userId: string,
  data: Omit<Prisma.QrCodeUncheckedCreateInput, 'userId' | 'urlHash'>,
): Promise<string | null> {
  const isDynamic = (data.kind ?? QrKind.DYNAMIC) === QrKind.DYNAMIC
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`qr-create:${userId}`}))`
        const limitError = await dailyCreateLimitError(tx, userId)
        if (limitError) return limitError

        await tx.qrCode.create({ data: { ...data, userId, urlHash: isDynamic ? generateUrlHash() : null } })
        return null
      })
    } catch (error) {
      const isHashCollision = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
      if (!isHashCollision || attempt >= MAX_HASH_ATTEMPTS) throw error
    }
  }
}

/**
 * Creates a QR code for the signed-in user: a dynamic code with a unique
 * redirect hash, or a direct code whose image encodes the endpoint itself.
 */
export async function createQrCodeAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const userId = await getSessionUserId()
  if (!userId) return { error: NOT_SIGNED_IN }
  if (await isAccountSuspended(userId)) return { error: accountSuspendedMessage() }

  const rateLimitError = saveRateLimitError(userId)
  if (rateLimitError) return { error: rateLimitError }

  const result = await parseQrCodeForm(formData)
  if ('error' in result) return { error: result.error }
  const { kind, leadsTo, note, shape, fgColor, bgColor } = result.data

  // Checked again under the lock; this one spares a Safe Browsing lookup.
  const earlyLimitError = await dailyCreateLimitError(prisma, userId)
  if (earlyLimitError) return { error: earlyLimitError }

  const verdict = await checkDestination(leadsTo)
  if (verdict.status === 'unsafe') {
    logger.warn('qr.unsafe_destination_rejected', { userId, threatTypes: verdict.threatTypes })
    return { error: UNSAFE_DESTINATION }
  }
  const destinationCheckedAt = verdict.status === 'safe' ? new Date() : null

  const limitError = await createWithinDailyLimit(userId, {
    kind,
    note,
    leadsTo,
    shape,
    fgColor,
    bgColor,
    destinationCheckedAt,
  })
  if (limitError) return { error: limitError }

  revalidatePath('/qrcodes')
  return { success: true }
}

/**
 * Updates a QR code's endpoint, note and design. The redirect hash and the
 * kind never change, so printed codes keep resolving, and a direct code's
 * endpoint can't change either. A new endpoint, or any save of a code disabled
 * for an unsafe destination, is checked with Safe Browsing; a clean result
 * enables such a code again. Manual disables stay.
 */
export async function updateQrCodeAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const userId = await getSessionUserId()
  if (!userId) return { error: NOT_SIGNED_IN }
  if (await isAccountSuspended(userId)) return { error: accountSuspendedMessage() }

  const id = formData.get('id')
  if (typeof id !== 'string' || !id) {
    return { error: 'Invalid request.' }
  }

  const rateLimitError = saveRateLimitError(userId)
  if (rateLimitError) return { error: rateLimitError }

  const current = await prisma.qrCode.findFirst({
    where: { id, userId },
    select: { kind: true, leadsTo: true, disabledReason: true },
  })
  if (!current) return { error: 'QR code not found.' }

  const result = await parseQrCodeForm(formData, current.kind === QrKind.DIRECT ? current.leadsTo : undefined)
  if ('error' in result) return { error: result.error }
  const { leadsTo, note, shape, fgColor, bgColor } = result.data

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
    if (urlHash) invalidateRedirect(urlHash)
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
    if (urlHash) invalidateRedirect(urlHash)
  } catch (error) {
    if (!isRecordNotFound(error)) throw error
  }

  revalidatePath('/qrcodes')
}
