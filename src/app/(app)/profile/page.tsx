import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { ProfileForm } from './profile-form'
import { ChangePasswordForm } from './change-password-form'

export const metadata: Metadata = {
  title: 'Profile — QR Codes',
}

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account details.</p>
      </div>
      <ProfileForm defaultName={session.user.name ?? ''} defaultEmail={session.user.email ?? ''} />
      <ChangePasswordForm />
    </div>
  )
}
