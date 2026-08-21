import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { AddQrCodeDialog } from '@/components/qrcode/add-qrcode-dialog'
import { QrCodeTable } from '@/components/qrcode/qr-code-table'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  // Independent reads, fetched together rather than sequentially — the
  // request headers don't depend on the session.
  const [session, requestHeaders] = await Promise.all([auth(), headers()])
  if (!session?.user?.id) {
    redirect('/login')
  }

  const qrCodes = await prisma.qrCode.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })

  // Derived from the incoming request rather than a static env var, so the
  // redirect links are correct whether hit directly (localhost:PORT) or
  // through a reverse proxy on a public domain, without needing to keep an
  // APP_URL setting in sync with the actual deployment.
  const proto = requestHeaders.get('x-forwarded-proto') ?? 'http'
  const host = requestHeaders.get('host')
  const appUrl = `${proto}://${host}`
  const rows = qrCodes.map((qrCode) => ({
    ...qrCode,
    redirectUrl: `${appUrl}/s/${qrCode.urlHash}`,
  }))

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Your QR Codes</h1>
        <AddQrCodeDialog />
      </div>
      <QrCodeTable qrCodes={rows} />
    </div>
  )
}
