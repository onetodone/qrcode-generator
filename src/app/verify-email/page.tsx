import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
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
      <VerifyEmailLayout
        title="Link expired"
        description="This confirmation link has expired. Request a new one below."
      >
        <ResendVerificationForm email={email} />
      </VerifyEmailLayout>
    )
  }

  if (status === 'invalid') {
    return (
      <VerifyEmailLayout title="Invalid link" description="This confirmation link is invalid or has already been used.">
        <Button className="w-full" variant="outline" nativeButton={false} render={<Link href="/login" />}>
          Back to sign in
        </Button>
      </VerifyEmailLayout>
    )
  }

  if (email) {
    return (
      <VerifyEmailLayout title="Check your email" description={`We sent a confirmation link to ${email}.`}>
        <ResendVerificationForm email={email} />
      </VerifyEmailLayout>
    )
  }

  redirect('/register')
}

function VerifyEmailLayout({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardFooter className="flex-col gap-2">{children}</CardFooter>
      </Card>
    </div>
  )
}
