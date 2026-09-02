import { PageContainer, PageHeader } from '@/components/page-header'
import { QrCodeFormSkeleton } from '@/components/qrcode/qr-code-form-skeleton'

export default function NewQrCodeLoading() {
  return (
    <PageContainer width="3xl">
      <PageHeader title="New QR Code" description="Create a new tracked QR code." />
      <QrCodeFormSkeleton />
    </PageContainer>
  )
}
