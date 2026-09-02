import { requireSession } from '@/lib/auth-guard'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()

  return (
    <>
      <SiteHeader userName={session.user.name} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  )
}
