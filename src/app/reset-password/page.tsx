import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { VerificationTokenType } from '@/generated/client'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
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
  const isValid = Boolean(record) && record?.type === VerificationTokenType.PASSWORD_RESET && record.expires > new Date()

  if (!isValid) {
    return (
      <ResetPasswordLayout title="Invalid or expired link" description="This password reset link is invalid or has expired.">
        <Button className="w-full" variant="outline" nativeButton={false} render={<Link href="/forgot-password" />}>
          Request a new link
        </Button>
      </ResetPasswordLayout>
    )
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <ResetPasswordForm token={token} />
    </div>
  )
}

function ResetPasswordLayout({
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
