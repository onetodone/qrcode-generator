import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/submit-button'
import { logoutAction } from '@/actions/auth'

export function SiteHeader({ userName }: { userName?: string | null }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 p-4 sm:px-8">
        <Link href="/" className="text-xl font-semibold">
          <Image
            src={`${process.env.APP_URL}/logo.png`}
            alt="QR Code OneToDone"
            width={240}
            height={42}
            className="h-auto max-h-[42px] max-w-[240px] w-auto"
            priority
          />
        </Link>
        <nav className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" nativeButton={false} render={<Link href="/" />}>
            Dashboard
          </Button>
          <Button variant="ghost" nativeButton={false} render={<Link href="/profile" />}>
            Profile
          </Button>
          {userName && <span className="hidden text-sm text-muted-foreground sm:inline">{userName}</span>}
          <form action={logoutAction}>
            <SubmitButton variant="outline" pendingLabel="Signing out...">
              Sign out
            </SubmitButton>
          </form>
        </nav>
      </div>
    </header>
  )
}
