import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { PageContainer, PageHeader } from '@/components/page-header'
import { enabledOAuthProviders } from '@/lib/oauth-providers'

function AccountDetailsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex justify-end pt-2">
          <Skeleton className="h-9 w-28" />
        </div>
      </CardContent>
    </Card>
  )
}

function ChangePasswordSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Skeleton className="h-9 w-36" />
        </div>
      </CardContent>
    </Card>
  )
}

function ConnectedAccountsSkeleton({ count }: { count: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y">
          {Array.from({ length: count }, (_, index) => (
            <li key={index} className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
              <span className="flex items-center gap-2">
                <Skeleton className="size-4 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </span>
              <Skeleton className="h-8 w-24" />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function DeleteAccountSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-full max-w-md" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-9 w-32" />
      </CardContent>
    </Card>
  )
}

export default function ProfileLoading() {
  const providerCount = enabledOAuthProviders().length

  return (
    <PageContainer>
      <PageHeader title="Profile" description="Manage your account details." />
      <AccountDetailsSkeleton />
      <ChangePasswordSkeleton />
      {providerCount > 0 && <ConnectedAccountsSkeleton count={providerCount} />}
      <DeleteAccountSkeleton />
    </PageContainer>
  )
}
