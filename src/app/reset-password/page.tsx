import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { VerificationTokenType } from '@/generated/client'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { AuthCard, AuthLayout } from '@/components/auth-card'
import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = {
  title: 'Reset password',
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  if (!token) {
    redirect('/forgot-password')
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } })
  const isValid =
    Boolean(record) && record?.type === VerificationTokenType.PASSWORD_RESET && record.expires > new Date()

  if (!isValid) {
    return (
      <AuthCard title="Invalid or expired link" description="This password reset link is invalid or has expired.">
        <Button className="w-full" variant="outline" nativeButton={false} render={<Link href="/forgot-password" />}>
          Request a new link
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthLayout>
      <ResetPasswordForm token={token} />
    </AuthLayout>
  )
}
