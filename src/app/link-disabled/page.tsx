import type { Metadata } from 'next'
import { connection } from 'next/server'
import { AuthCard } from '@/components/auth-card'

export const metadata: Metadata = {
  title: 'Link disabled',
  robots: { index: false, follow: false },
}

export default async function LinkDisabledPage() {
  await connection()

  return (
    <AuthCard
      title="Link disabled"
      description="This QR code or link was disabled because its destination was reported as harmful, for example phishing or malware."
    />
  )
}
