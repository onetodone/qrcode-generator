import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthCard } from '@/components/auth-card'
import { readHandoffCookie } from '@/lib/handoff-cookies'
import { ResendVerificationForm } from './resend-verification-form'

export const metadata: Metadata = {
  title: 'Verify email',
}

export default async function VerifyEmailPage() {
  const email = await readHandoffCookie('pendingEmail')
  if (!email) {
    redirect('/register')
  }

  return (
    <AuthCard title="Check your email" description={`We sent an email to ${email}. Follow the link in it to continue.`}>
      <ResendVerificationForm email={email} />
    </AuthCard>
  )
}
