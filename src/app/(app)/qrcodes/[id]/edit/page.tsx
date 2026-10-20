import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getShortLinkBaseUrl } from '@/lib/request'
import { qrCodeContent } from '@/lib/qrcode'
import { requireUserId } from '@/lib/auth-guard'
import { updateQrCodeAction } from '@/actions/qrcode'
import { PageContainer, PageHeader } from '@/components/page-header'
import { QrCodeForm } from '@/components/qrcode/qr-code-form'
import { QrDisabledAlert } from '@/components/qrcode/qr-disabled-notice'

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

  const baseUrl = await getShortLinkBaseUrl()
  const isDirect = qrCode.kind === 'DIRECT'

  return (
    <PageContainer width="3xl">
      <PageHeader
        title="Edit QR Code"
        description={
          isDirect
            ? 'Update the note and design. The endpoint is part of the image, so it stays the same.'
            : 'Update the endpoint, note, and design. The tracking link stays the same, so printed codes keep working.'
        }
      />
      {qrCode.disabledReason && <QrDisabledAlert reason={qrCode.disabledReason} />}
      <QrCodeForm
        action={updateQrCodeAction}
        hiddenId={qrCode.id}
        submitLabel="Save changes"
        pendingLabel="Saving..."
        successMessage="QR code updated."
        kind={qrCode.kind}
        previewValue={qrCodeContent(qrCode, baseUrl)}
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
