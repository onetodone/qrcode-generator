import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const host = headersList.get('host') ?? `localhost:${process.env.PORT ?? 3000}`
  const protocol = headersList.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')

  return {
    metadataBase: new URL(`${protocol}://${host}`),
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
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
