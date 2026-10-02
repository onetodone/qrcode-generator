import type { ReactNode } from 'react'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { LegalLinks } from '@/components/legal-links'

/** Full-viewport centered wrapper for the signed-out auth screens, with the legal links below. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4">
      {children}
      <LegalLinks className="justify-center text-xs text-muted-foreground" />
    </div>
  )
}

/** A titled status card (invalid link, check your email, disabled link); actions go in `children`. */
export function AuthCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <AuthLayout>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children && <CardFooter className="flex-col gap-2">{children}</CardFooter>}
      </Card>
    </AuthLayout>
  )
}
