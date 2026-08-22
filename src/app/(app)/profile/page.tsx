import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ProfileForm } from './profile-form'
import { ChangePasswordForm } from './change-password-form'

export const metadata: Metadata = {
  title: 'Profile',
}

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  // Read live from the DB rather than trusting the JWT — the session doesn't
  // carry emailVerified, and it wouldn't reflect a change made this request.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
  })

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account details.</p>
      </div>
      <ProfileForm
        defaultName={session.user.name ?? ''}
        defaultEmail={session.user.email ?? ''}
        emailVerified={Boolean(user?.emailVerified)}
      />
      <ChangePasswordForm />
    </div>
  )
}
