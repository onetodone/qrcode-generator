import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Button } from '@/components/ui/button'
import { AuthCard } from '@/components/auth-card'

export const metadata: Metadata = {
  title: 'Account deleted',
  robots: { index: false, follow: false },
}

export default async function AccountDeletedPage() {
  await connection()

  return (
    <AuthCard
      title="Account deleted"
      description="Your account and all its QR codes were deleted. Their links no longer work."
    >
      <Button className="w-full" variant="outline" nativeButton={false} render={<Link href="/" />}>
        Back to home
      </Button>
    </AuthCard>
  )
}
