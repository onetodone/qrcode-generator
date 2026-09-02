import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { PageContainer, PageHeader } from '@/components/page-header'

function FormCardSkeleton({ fields }: { fields: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-24" />
      </CardContent>
    </Card>
  )
}

export default function ProfileLoading() {
  return (
    <PageContainer>
      <PageHeader title="Profile" description="Manage your account details." />
      <FormCardSkeleton fields={2} />
      <FormCardSkeleton fields={3} />
    </PageContainer>
  )
}
