import type { Metadata } from 'next'
import Link from 'next/link'
import { PlusIcon } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getBaseUrl } from '@/lib/request'
import { requireUserId } from '@/lib/auth-guard'
import { Button } from '@/components/ui/button'
import { PageContainer, PageHeader } from '@/components/page-header'
import { QrCodeGrid } from '@/components/qrcode/qr-code-grid'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const userId = await requireUserId()

  const [qrCodes, baseUrl] = await Promise.all([
    prisma.qrCode.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    getBaseUrl(),
  ])

  const rows = qrCodes.map((qrCode) => ({
    ...qrCode,
    redirectUrl: `${baseUrl}/s/${qrCode.urlHash}`,
  }))

  return (
    <PageContainer width="6xl">
      <PageHeader
        title="Your QR Codes"
        action={
          <Button nativeButton={false} render={<Link href="/qr-codes/new" />}>
            <PlusIcon />
            Add QR Code
          </Button>
        }
      />
      <QrCodeGrid qrCodes={rows} />
    </PageContainer>
  )
}
