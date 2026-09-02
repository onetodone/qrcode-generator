import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Loading placeholder for the QR code create/edit form. */
export function QrCodeFormSkeleton() {
  return (
    <Card>
      <CardContent className="grid gap-6 md:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-5">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex flex-col items-center gap-2 md:w-48">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="size-[184px]" />
        </div>
      </CardContent>
    </Card>
  )
}
