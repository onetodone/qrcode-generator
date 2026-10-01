import type { Metadata } from 'next'
import { getBaseUrl } from '@/lib/request'
import { requireUserId } from '@/lib/auth-guard'
import { createQrCodeAction } from '@/actions/qrcode'
import { PageContainer, PageHeader } from '@/components/page-header'
import { QrCodeForm } from '@/components/qrcode/qr-code-form'

export const metadata: Metadata = {
  title: 'New QR Code',
}

// A fixed 32-char stand-in (the real hash length) so the preview's module
// density matches the code that will actually be generated on save.
const SAMPLE_HASH = 'abcdefghijklmnopqrstuvwxyz012345'

export default async function NewQrCodePage() {
  await requireUserId()
  const baseUrl = await getBaseUrl()

  return (
    <PageContainer width="3xl">
      <PageHeader title="New QR Code" description="Create a new tracked QR code." />
      <QrCodeForm
        action={createQrCodeAction}
        submitLabel="Create QR Code"
        pendingLabel="Creating..."
        successMessage="QR code created."
        previewValue={`${baseUrl}/s/${SAMPLE_HASH}`}
      />
    </PageContainer>
  )
}
