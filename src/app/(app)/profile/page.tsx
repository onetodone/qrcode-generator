import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth-guard'
import { PageContainer, PageHeader } from '@/components/page-header'
import { ProfileForm } from './profile-form'
import { ChangePasswordForm } from './change-password-form'
import { DeleteAccountForm } from './delete-account-form'
import { SetPasswordCard } from './set-password-card'
import { ConnectedAccounts, type ConnectedProvider } from './connected-accounts'
import { enabledOAuthProviders, oauthProviderName } from '@/lib/oauth-providers'
import { signInErrorMessage } from '@/lib/sign-in-errors'

export const metadata: Metadata = {
  title: 'Profile',
}

export default async function ProfilePage({ searchParams }: PageProps<'/profile'>) {
  const session = await requireSession()
  const { error } = await searchParams

  // Read live from the DB rather than trusting the JWT — the session doesn't
  // carry emailVerified, and it wouldn't reflect a change made this request.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      emailVerified: true,
      pendingEmail: true,
      password: true,
      accounts: { select: { provider: true } },
      _count: { select: { qrCodes: true } },
    },
  })

  const email = user?.email ?? session.user.email ?? ''
  const hasPassword = Boolean(user?.password)
  const connectedIds = new Set(user?.accounts.map((account) => account.provider))
  const enabledIds = enabledOAuthProviders().map((provider) => provider.id)
  const providers: ConnectedProvider[] = [...new Set([...enabledIds, ...connectedIds])].map((id) => ({
    id,
    name: oauthProviderName(id),
    connected: connectedIds.has(id),
    enabled: enabledIds.includes(id),
  }))

  return (
    <PageContainer>
      <PageHeader title="Profile" description="Manage your account details." />
      <ProfileForm
        defaultName={session.user.name ?? ''}
        defaultEmail={email}
        emailVerified={Boolean(user?.emailVerified)}
        pendingEmail={user?.pendingEmail ?? null}
      />
      {hasPassword ? <ChangePasswordForm /> : <SetPasswordCard email={email} />}
      {providers.length > 0 && (
        <ConnectedAccounts
          providers={providers}
          isOnlySignInMethod={!hasPassword && connectedIds.size === 1}
          error={signInErrorMessage(typeof error === 'string' ? error : undefined, 'profile')}
        />
      )}
      <DeleteAccountForm email={email} hasPassword={hasPassword} qrCodeCount={user?._count.qrCodes ?? 0} />
    </PageContainer>
  )
}
