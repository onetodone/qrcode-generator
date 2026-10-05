import type { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/submit-button'
import { logoutAction } from '@/actions/auth'

function HeaderShell({ logoHref, children }: { logoHref: string; children: ReactNode }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 p-4 sm:px-8">
        <Link href={logoHref} className="text-xl font-semibold">
          <Image
            src="/logo.png"
            alt="QR Code OneToDone"
            width={42}
            height={42}
            className="h-auto max-h-[42px] max-w-[240px] w-auto"
            priority
          />
        </Link>
        <nav className="flex flex-wrap items-center gap-2">{children}</nav>
      </div>
    </header>
  )
}

function SignOutForm() {
  return (
    <form action={logoutAction}>
      <SubmitButton variant="outline" pendingLabel="Signing out...">
        Sign out
      </SubmitButton>
    </form>
  )
}

export function SiteHeader({ userName }: { userName?: string | null }) {
  return (
    <HeaderShell logoHref="/qrcodes">
      <Button variant="ghost" nativeButton={false} render={<Link href="/qrcodes" />}>
        Dashboard
      </Button>
      <Button variant="ghost" nativeButton={false} render={<Link href="/profile" />}>
        Profile
      </Button>
      {userName && <span className="hidden text-sm text-muted-foreground sm:inline">{userName}</span>}
      <SignOutForm />
    </HeaderShell>
  )
}

/** Header for public pages: sign-in and registration links for guests, the dashboard link and sign-out otherwise. */
export function PublicHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <HeaderShell logoHref="/">
      {signedIn ? (
        <>
          <Button nativeButton={false} render={<Link href="/qrcodes" />}>
            My QR Codes
          </Button>
          <SignOutForm />
        </>
      ) : (
        <>
          <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>
            Sign in
          </Button>
          <Button nativeButton={false} render={<Link href="/register" />}>
            Get started
          </Button>
        </>
      )}
    </HeaderShell>
  )
}
