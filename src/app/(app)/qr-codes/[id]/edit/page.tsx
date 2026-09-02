import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getBaseUrl } from '@/lib/request'
import { requireUserId } from '@/lib/auth-guard'
import { updateQrCodeAction } from '@/actions/qrcode'
import { PageContainer, PageHeader } from '@/components/page-header'
import { QrCodeForm } from '@/components/qrcode/qr-code-form'

export const metadata: Metadata = {
  title: 'Edit QR Code',
}

export default async function EditQrCodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = await requireUserId()

  const qrCode = await prisma.qrCode.findFirst({ where: { id, userId } })
  if (!qrCode) {
    notFound()
  }

  const baseUrl = await getBaseUrl()

  return (
    <PageContainer width="3xl">
      <PageHeader
        title="Edit QR Code"
        description="Update the endpoint, note, and design. The tracking link stays the same, so printed codes keep working."
      />
      <QrCodeForm
        action={updateQrCodeAction}
        hiddenId={qrCode.id}
        submitLabel="Save changes"
        pendingLabel="Saving..."
        successMessage="QR code updated."
        previewValue={`${baseUrl}/s/${qrCode.urlHash}`}
        defaultValues={{
          leadsTo: qrCode.leadsTo,
          note: qrCode.note,
          shape: qrCode.shape,
          fgColor: qrCode.fgColor,
          bgColor: qrCode.bgColor,
        }}
      />
    </PageContainer>
  )
}
