import { QrCodeCard, type QrCodeCardData } from '@/components/qrcode/qr-code-card'

export function QrCodeGrid({ qrCodes }: { qrCodes: QrCodeCardData[] }) {
  if (qrCodes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
        No QR codes yet. Click &ldquo;Add QR Code&rdquo; to create your first one.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {qrCodes.map((qrCode) => (
        <QrCodeCard key={qrCode.id} qrCode={qrCode} />
      ))}
    </div>
  )
}

export type { QrCodeCardData }
