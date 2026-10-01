import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { AnalyticsConsentProvider } from '@/components/analytics-consent'
import { getSessionUserId } from '@/lib/auth-guard'
import { ANALYTICS_CONSENT_COOKIE, getAnalyticsId, parseAnalyticsConsent } from '@/lib/analytics'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const appUrl =
  process.env.APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
  `http://localhost:${process.env.PORT ?? 3000}`

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'QR Code OneToDone',
    template: '%s | QR Code OneToDone',
  },
  description: 'Create QR codes with short redirect links and see how many times each one is scanned.',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'QR Code OneToDone',
    description: 'Create QR codes with short redirect links and see how many times each one is scanned.',
    type: 'website',
  },
}

async function Analytics({ gaId, children }: { gaId: string; children: React.ReactNode }) {
  const [userId, cookieStore] = await Promise.all([getSessionUserId(), cookies()])
  const consent = parseAnalyticsConsent(cookieStore.get(ANALYTICS_CONSENT_COOKIE)?.value)

  return (
    <AnalyticsConsentProvider gaId={gaId} userId={userId} initialConsent={consent}>
      {children}
    </AnalyticsConsentProvider>
  )
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  const gaId = getAnalyticsId()

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {gaId ? <Analytics gaId={gaId}>{children}</Analytics> : children}
        <Toaster />
      </body>
    </html>
  )
}
