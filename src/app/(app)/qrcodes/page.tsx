import type { Metadata } from 'next'
import Link from 'next/link'
import { PlusIcon } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getShortLinkBaseUrl } from '@/lib/request'
import { qrCodeContent } from '@/lib/qrcode'
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
    getShortLinkBaseUrl(),
  ])

  const rows = qrCodes.map((qrCode) => ({
    ...qrCode,
    qrContent: qrCodeContent(qrCode, baseUrl),
  }))

  return (
    <PageContainer width="6xl">
      <PageHeader
        title="Your QR Codes"
        action={
          <Button nativeButton={false} render={<Link href="/qrcodes/new" />}>
            <PlusIcon />
            Add QR Code
          </Button>
        }
      />
      <QrCodeGrid qrCodes={rows} />
    </PageContainer>
  )
}
