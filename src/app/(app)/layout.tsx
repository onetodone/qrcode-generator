import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  return (
    <>
      <SiteHeader userName={session.user.name} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  )
}
