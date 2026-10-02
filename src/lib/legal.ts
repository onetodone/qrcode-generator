import { getAnalyticsId } from '@/lib/analytics'
import { isSafeBrowsingEnabled } from '@/lib/safe-browsing'

/** Date the Terms of Use and Privacy Policy last changed. */
export const LEGAL_LAST_UPDATED = new Date('2026-10-02T00:00:00Z')

/**
 * Who runs this instance, how to reach them, and which optional services it
 * uses, for the Terms of Use and Privacy Policy. `null` means not configured.
 */
export type LegalInfo = {
  operatorName: string | null
  jurisdiction: string | null
  supportEmail: string | null
  abuseEmail: string | null
  analytics: boolean
  safeBrowsing: boolean
  vercel: boolean
}

function envValue(name: string): string | null {
  return process.env[name]?.trim() || null
}

/**
 * Reads `LEGAL_OPERATOR_NAME`, `LEGAL_JURISDICTION`, `SUPPORT_EMAIL` and
 * `ABUSE_EMAIL` (falling back to `SUPPORT_EMAIL`), and whether Google
 * Analytics, Safe Browsing and Vercel are in use. Never throws, so the legal
 * pages render on an incomplete setup.
 */
export function getLegalInfo(): LegalInfo {
  const supportEmail = envValue('SUPPORT_EMAIL')
  return {
    operatorName: envValue('LEGAL_OPERATOR_NAME'),
    jurisdiction: envValue('LEGAL_JURISDICTION'),
    supportEmail,
    abuseEmail: envValue('ABUSE_EMAIL') ?? supportEmail,
    analytics: getAnalyticsId() !== null,
    safeBrowsing: isSafeBrowsingEnabled(),
    vercel: Boolean(process.env.VERCEL),
  }
}
