import type { Metadata } from 'next'
import Link from 'next/link'
import { VerificationTokenType } from '@/generated/client'
import { prisma } from '@/lib/prisma'
import { readHandoffCookie } from '@/lib/handoff-cookies'
import { Button } from '@/components/ui/button'
import { AuthCard, AuthLayout } from '@/components/auth-card'
import { ResendVerificationForm } from '@/app/verify-email/resend-verification-form'
import { ConfirmEmailForm } from './confirm-email-form'

export const metadata: Metadata = {
  title: 'Confirm email',
  robots: { index: false, follow: false },
}

// Looked up without using the token up: only the form's POST does that.
async function findConfirmation(token: string) {
  const record = await prisma.verificationToken.findUnique({ where: { token } })

  if (record?.type === VerificationTokenType.EMAIL_VERIFY) {
    const user = await prisma.user.findUnique({
      where: { email: record.identifier },
      select: { emailVerified: true },
    })
    return user && !user.emailVerified ? record : null
  }

  if (record?.type === VerificationTokenType.EMAIL_CHANGE) {
    const user = await prisma.user.findFirst({ where: { pendingEmail: record.identifier }, select: { id: true } })
    return user ? record : null
  }

  return null
}

export default async function ConfirmEmailPage() {
  const token = await readHandoffCookie('confirmToken')
  const record = token ? await findConfirmation(token) : null

  if (!token || !record) {
    return (
      <AuthCard title="Invalid link" description="This confirmation link is invalid or has already been used.">
        <Button className="w-full" variant="outline" nativeButton={false} render={<Link href="/login" />}>
          Back to sign in
        </Button>
      </AuthCard>
    )
  }

  if (record.expires < new Date()) {
    return (
      <AuthCard title="Link expired" description="This confirmation link has expired. Request a new one below.">
        <ResendVerificationForm email={record.identifier} />
      </AuthCard>
    )
  }

  return (
    <AuthLayout>
      <ConfirmEmailForm
        token={token}
        email={record.identifier}
        choosePassword={record.type === VerificationTokenType.EMAIL_VERIFY}
      />
    </AuthLayout>
  )
}
