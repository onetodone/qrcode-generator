import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export default function NewQrCodeLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold">New QR Code</h1>
        <p className="text-sm text-muted-foreground">Create a new tracked QR code.</p>
      </div>
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
    </div>
  )
}
