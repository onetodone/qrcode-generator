import { PageContainer, PageHeader } from '@/components/page-header'
import { QrCodeFormSkeleton } from '@/components/qrcode/qr-code-form-skeleton'

export default function EditQrCodeLoading() {
  return (
    <PageContainer width="3xl">
      <PageHeader
        title="Edit QR Code"
        description="Update the endpoint, note, and design. The tracking link stays the same, so printed codes keep working."
      />
      <QrCodeFormSkeleton />
    </PageContainer>
  )
}
