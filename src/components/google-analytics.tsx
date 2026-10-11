'use client'

import { useEffect, useRef } from 'react'
import Script from 'next/script'

declare global {
  interface Window {
    dataLayer?: unknown[]
    [disableKey: `ga-disable-${string}`]: boolean | undefined
  }
}

// gtag.js only processes queue entries that are `arguments` objects, not plain arrays.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function gtag(..._args: unknown[]) {
  // eslint-disable-next-line prefer-rest-params
  ;(window.dataLayer ??= []).push(arguments)
}

function inlineJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

/**
 * Loads GA4 with the signed-in user's internal id (never PII) as `user_id` in
 * the `config` call, so the first `page_view` of a full page load is already
 * attributed. A sign-in or sign-out without a reload updates it with `set`.
 */
export function GoogleAnalytics({ gaId, userId }: { gaId: string; userId: string | null }) {
  const configuredUserId = useRef(userId)

  useEffect(() => {
    if (configuredUserId.current === userId) return
    configuredUserId.current = userId
    gtag('set', { user_id: userId })
  }, [userId])

  return (
    <>
      <Script id="ga-init">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', ${inlineJson(gaId)}, ${inlineJson(userId ? { user_id: userId } : {})});`}
      </Script>
      <Script id="ga-loader" src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`} />
    </>
  )
}
