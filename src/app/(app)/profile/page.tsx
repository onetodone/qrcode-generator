import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guard'
import { PageContainer, PageHeader } from '@/components/page-header'
import { ProfileForm } from './profile-form'
import { ChangePasswordForm } from './change-password-form'

export const metadata: Metadata = {
  title: 'Profile',
}

export default async function ProfilePage() {
  const session = await requireSession()

  // Read live from the DB rather than trusting the JWT — the session doesn't
  // carry emailVerified, and it wouldn't reflect a change made this request.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true, pendingEmail: true },
  })

  return (
    <PageContainer>
      <PageHeader title="Profile" description="Manage your account details." />
      <ProfileForm
        defaultName={session.user.name ?? ''}
        defaultEmail={session.user.email ?? ''}
        emailVerified={Boolean(user?.emailVerified)}
        pendingEmail={user?.pendingEmail ?? null}
      />
      <ChangePasswordForm />
    </PageContainer>
  )
}
