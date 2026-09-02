import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AuthCard } from '@/components/auth-card'
import { ResendVerificationForm } from './resend-verification-form'

export const metadata: Metadata = {
  title: 'Verify email',
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; email?: string }>
}) {
  const { status, email } = await searchParams

  if (status === 'expired' && email) {
    return (
      <AuthCard title="Link expired" description="This confirmation link has expired. Request a new one below.">
        <ResendVerificationForm email={email} />
      </AuthCard>
    )
  }

  if (status === 'invalid') {
    return (
      <AuthCard title="Invalid link" description="This confirmation link is invalid or has already been used.">
        <Button className="w-full" variant="outline" nativeButton={false} render={<Link href="/login" />}>
          Back to sign in
        </Button>
      </AuthCard>
    )
  }

  if (email) {
    return (
      <AuthCard title="Check your email" description={`We sent a confirmation link to ${email}.`}>
        <ResendVerificationForm email={email} />
      </AuthCard>
    )
  }

  redirect('/register')
}
