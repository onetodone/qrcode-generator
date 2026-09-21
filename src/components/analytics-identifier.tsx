'use client'

import { useEffect } from 'react'
import { sendGAEvent } from '@next/third-parties/google'

/**
 * Sets GA4's `user_id` via the dataLayer queue (not `window.gtag`, which
 * `@next/third-parties` never exposes) so visits are stitched to the signed-in
 * user without ever sending PII — only our internal user id.
 */
export function AnalyticsIdentifier({ userId }: { userId: string | null }) {
  useEffect(() => {
    sendGAEvent('set', { user_id: userId })
  }, [userId])

  return null
}
