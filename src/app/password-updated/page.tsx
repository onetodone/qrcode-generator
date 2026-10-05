import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AuthCard } from '@/components/auth-card'

export const metadata: Metadata = {
  title: 'Password updated',
  robots: { index: false, follow: false },
}

export default async function PasswordUpdatedPage() {
  return (
    <AuthCard title="Password updated" description="Your password has been changed. Sign in with your new password.">
      <Button className="w-full" nativeButton={false} render={<Link href={'/login'} />}>
        Back to sign in
      </Button>
    </AuthCard>
  )
}
