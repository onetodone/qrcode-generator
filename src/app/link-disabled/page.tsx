import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { getLegalInfo } from '@/lib/legal'
import { AuthCard } from '@/components/auth-card'

export const metadata: Metadata = {
  title: 'Link disabled',
  robots: { index: false, follow: false },
}

export default async function LinkDisabledPage() {
  await connection()
  const { supportEmail } = getLegalInfo()

  return (
    <AuthCard
      title="Link disabled"
      description="This QR code or link was disabled because its destination was reported as harmful or breaks our Terms of Use. You weren’t redirected to it."
    >
      <p className="w-full text-sm text-muted-foreground">
        If this is your code,{' '}
        <Link href="/login" className="underline underline-offset-4">
          sign in
        </Link>{' '}
        to see why it was disabled
        {supportEmail && (
          <>
            {' '}
            or write to us at{' '}
            <a href={`mailto:${supportEmail}`} className="underline underline-offset-4">
              {supportEmail}
            </a>
          </>
        )}
        .
      </p>
    </AuthCard>
  )
}
