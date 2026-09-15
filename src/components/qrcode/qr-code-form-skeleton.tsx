import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Loading placeholder for the QR code create/edit form. */
export function QrCodeFormSkeleton() {
  return (
    <Card>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-6 md:col-start-1 md:row-start-1">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-3.5 w-56" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-3.5 w-80" />
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-12" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-8 w-20 rounded-lg" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                  <Skeleton className="h-8 w-16 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-20" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-10 rounded-md shrink-0" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-20" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-10 rounded-md shrink-0" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 md:col-start-2 md:row-start-1 md:w-48">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="size-[192px] rounded-lg shrink-0" />
          </div>
          <div className="mt-4 flex justify-end gap-2 md:col-span-2 md:row-start-2">
            <Skeleton className="h-9 w-16 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
