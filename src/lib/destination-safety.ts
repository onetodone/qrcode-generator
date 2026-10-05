import { QrDisabledReason } from '@/generated/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sendCodesDisabledNotice } from '@/lib/account-emails'
import { invalidateRedirect } from '@/lib/redirect-cache'
import { isSafeBrowsingEnabled, lookupUrl, type UrlVerdict } from '@/lib/safe-browsing'

const HOUR_MS = 60 * 60_000
// Blocklists pick up a fresh phishing domain within hours of a campaign
// starting, so new destinations are re-checked more often than settled ones.
const NEW_DESTINATION_PERIOD_MS = 7 * 24 * HOUR_MS
const NEW_DESTINATION_RECHECK_MS = HOUR_MS
const RECHECK_MS = 24 * HOUR_MS

/** A code's destination and the state of its Safe Browsing checks. */
export type DestinationState = {
  urlHash: string
  leadsTo: string
  disabledAt: Date | null
  destinationSetAt: Date
  destinationCheckedAt: Date | null
}

function isWebUrl(leadsTo: string): boolean {
  try {
    const { protocol } = new URL(leadsTo)
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

/** Safe Browsing verdict for a destination. `mailto:` and `tel:` destinations are not looked up and give `unknown`. */
export async function checkDestination(leadsTo: string): Promise<UrlVerdict> {
  if (!isWebUrl(leadsTo)) return { status: 'unknown' }
  return lookupUrl(leadsTo)
}

/**
 * Whether an enabled code's web destination is due for another lookup: hourly
 * during the first week after it was set, daily after that, and right away if
 * it was never checked.
 */
export function isRecheckDue(code: DestinationState, now = Date.now()): boolean {
  if (code.disabledAt || !isSafeBrowsingEnabled() || !isWebUrl(code.leadsTo)) return false
  if (!code.destinationCheckedAt) return true

  const isNew = now - code.destinationSetAt.getTime() < NEW_DESTINATION_PERIOD_MS
  return now - code.destinationCheckedAt.getTime() >= (isNew ? NEW_DESTINATION_RECHECK_MS : RECHECK_MS)
}

/**
 * Looks a code's destination up again and disables the code when Safe Browsing
 * flags it. The lookup is claimed with a compare-and-set on
 * `destinationCheckedAt`, so concurrent scans on several instances send one
 * request. A failed lookup still counts as the check, so an outage doesn't
 * trigger a retry on every scan.
 */
export async function recheckDestination(code: DestinationState): Promise<void> {
  const { urlHash, leadsTo } = code
  try {
    const claimed = await prisma.qrCode.updateMany({
      where: { urlHash, leadsTo, disabledAt: null, destinationCheckedAt: code.destinationCheckedAt },
      data: { destinationCheckedAt: new Date() },
    })
    if (claimed.count === 0) return

    const verdict = await lookupUrl(leadsTo)
    if (verdict.status !== 'unsafe') return

    const disabled = await prisma.qrCode.updateMany({
      where: { urlHash, leadsTo, disabledAt: null },
      data: { disabledAt: new Date(), disabledReason: QrDisabledReason.UNSAFE_DESTINATION },
    })
    if (disabled.count === 0) return

    invalidateRedirect(urlHash)
    logger.warn('qr.disabled_unsafe_destination', { hash: urlHash, threatTypes: verdict.threatTypes })
    await notifyOwner(urlHash)
  } catch (error) {
    logger.error('qr.destination_recheck_failed', { error, hash: urlHash })
  }
}

async function notifyOwner(urlHash: string): Promise<void> {
  try {
    const code = await prisma.qrCode.findUnique({
      where: { urlHash },
      select: { id: true, note: true, urlHash: true, user: { select: { email: true, name: true } } },
    })
    if (code) await sendCodesDisabledNotice(code.user, QrDisabledReason.UNSAFE_DESTINATION, [code])
  } catch (error) {
    logger.error('qr.disabled_notice_failed', { error, hash: urlHash })
  }
}
