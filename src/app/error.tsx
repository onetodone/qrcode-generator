'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function RootErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        An unexpected error occurred. You can try again, or refresh the page.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
