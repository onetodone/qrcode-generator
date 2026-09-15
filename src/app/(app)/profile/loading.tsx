import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { PageContainer, PageHeader } from '@/components/page-header'

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

export default function ProfileLoading() {
  return (
    <PageContainer>
      <PageHeader title="Profile" description="Manage your account details." />
      <div className="flex flex-col gap-6">
        <AccountDetailsSkeleton />
        <ChangePasswordSkeleton />
      </div>
    </PageContainer>
  )
}
