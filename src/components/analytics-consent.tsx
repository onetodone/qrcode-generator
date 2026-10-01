'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { GoogleAnalytics } from '@next/third-parties/google'
import { AnalyticsIdentifier } from '@/components/analytics-identifier'
import { Button } from '@/components/ui/button'
import { ANALYTICS_CONSENT_COOKIE, ANALYTICS_CONSENT_MAX_AGE_SECONDS, type AnalyticsConsent } from '@/lib/analytics'

const OpenSettingsContext = createContext<(() => void) | null>(null)

function storeConsent(consent: AnalyticsConsent) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${consent}; Max-Age=${ANALYTICS_CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`
}

// gtag.js puts its cookies on the widest domain it may (e.g. `.example.com` for
// `app.example.com`), so every parent domain of the host is tried.
function deleteAnalyticsCookies() {
  const names = document.cookie
    .split(';')
    .map((cookie) => cookie.split('=', 1)[0]?.trim() ?? '')
    .filter((name) => name === '_ga' || name.startsWith('_ga_'))
  const labels = window.location.hostname.split('.')
  const domains = labels.map((_, index) => labels.slice(index).join('.'))

  for (const name of names) {
    document.cookie = `${name}=; Max-Age=0; Path=/`
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${domain}`
    }
  }
}

function ConsentBanner({ onChoose }: { onChoose: (consent: AnalyticsConsent) => void }) {
  return (
    <section
      aria-label="Cookie consent"
      className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-3 rounded-lg border bg-background p-4 text-sm shadow-lg sm:right-auto sm:max-w-sm"
    >
      <p>
        We&apos;d like to use Google Analytics cookies to see how this site is used. They stay off unless you accept.
        See the{' '}
        <Link href="/privacy-policy" className="underline underline-offset-4">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => onChoose('denied')}>
          Decline
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => onChoose('granted')}>
          Accept
        </Button>
      </div>
    </section>
  )
}

/**
 * Loads Google Analytics only after the visitor accepts it in the consent
 * banner, which shows until a choice is stored. `CookieSettingsButton` opens
 * the banner again; declining after accepting removes the GA cookies and
 * reloads the page, so gtag.js is gone.
 */
export function AnalyticsConsentProvider({
  gaId,
  userId,
  initialConsent,
  children,
}: {
  gaId: string
  userId: string | null
  initialConsent: AnalyticsConsent | null
  children: ReactNode
}) {
  const [consent, setConsent] = useState(initialConsent)
  const [bannerOpen, setBannerOpen] = useState(initialConsent === null)

  function choose(next: AnalyticsConsent) {
    storeConsent(next)
    setBannerOpen(false)
    if (next === 'denied' && consent === 'granted') {
      window[`ga-disable-${gaId}`] = true
      deleteAnalyticsCookies()
      window.location.reload()
      return
    }
    setConsent(next)
  }

  return (
    <OpenSettingsContext value={() => setBannerOpen(true)}>
      {children}
      {consent === 'granted' && (
        <>
          <GoogleAnalytics gaId={gaId} />
          <AnalyticsIdentifier userId={userId} />
        </>
      )}
      {bannerOpen && <ConsentBanner onChoose={choose} />}
    </OpenSettingsContext>
  )
}

/** Reopens the analytics consent banner. Renders nothing when analytics is off. */
export function CookieSettingsButton({ className }: { className?: string }) {
  const openSettings = useContext(OpenSettingsContext)
  if (!openSettings) return null

  return (
    <button type="button" onClick={openSettings} className={className}>
      Cookie settings
    </button>
  )
}
