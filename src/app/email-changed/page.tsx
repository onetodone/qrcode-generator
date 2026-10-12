import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AuthCard } from '@/components/auth-card'

export const metadata: Metadata = {
  title: 'Email changed',
  robots: { index: false, follow: false },
}

export default async function EmailChangedPage() {
  return (
    <AuthCard title="Email changed" description="Your account now uses the new email address. Sign in with it.">
      <Button className="w-full" nativeButton={false} render={<Link href={'/login'} />}>
        Back to sign in
      </Button>
    </AuthCard>
  )
}
