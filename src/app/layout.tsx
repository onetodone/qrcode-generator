import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { GoogleAnalytics } from '@next/third-parties/google'
import { AnalyticsIdentifier } from '@/components/analytics-identifier'
import { getSessionUserId } from '@/lib/auth-guard'
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
  'http://localhost:3000'

const gaTagId = process.env.GATAG_ID ?? ''

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'QR Code OneToDone',
    template: '%s | QR Code OneToDone',
  },
  description: 'Internal QR code generator and tracker.',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'QR Code OneToDone',
    description: 'Internal QR code generator and tracker.',
    type: 'website',
  },
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const userId = gaTagId ? await getSessionUserId() : null

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
      {gaTagId && (
        <>
          <GoogleAnalytics gaId={gaTagId} />
          <AnalyticsIdentifier userId={userId} />
        </>
      )}
    </html>
  )
}
