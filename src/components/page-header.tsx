import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const MAX_WIDTH = {
  lg: 'max-w-lg',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '6xl': 'max-w-6xl',
} as const

/** Standard padded, centered column wrapper for a signed-in page. */
export function PageContainer({ width = '2xl', children }: { width?: keyof typeof MAX_WIDTH; children: ReactNode }) {
  return <div className={cn('mx-auto flex w-full flex-col gap-6 p-4 sm:p-8', MAX_WIDTH[width])}>{children}</div>
}

/** Page title + optional description, with an optional trailing action. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
