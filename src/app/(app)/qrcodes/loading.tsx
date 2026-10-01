import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PageContainer, PageHeader } from '@/components/page-header'

export default function DashboardLoading() {
  return (
    <PageContainer width="6xl">
      <PageHeader title="Your QR Codes" action={<Skeleton className="h-8 w-36" />} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index} className="px-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-[92px] w-[92px] shrink-0 rounded-md" />
              <div className="min-w-0 flex flex-col flex-1 h-[92px]">
                <Skeleton className="h-4 w-3/4 mb-1" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-16 mt-auto" />
              </div>
            </div>
            <Separator className="my-1" />
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-7 w-12" />
              </div>
              <div className="flex gap-1">
                <Skeleton className="size-7" />
                <Skeleton className="size-7" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  )
}
