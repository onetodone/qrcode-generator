import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { QrCodeRow, type QrCodeRowData } from '@/components/qrcode/qr-code-row'

export function QrCodeTable({ qrCodes }: { qrCodes: QrCodeRowData[] }) {
  if (qrCodes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
        No QR codes yet. Click &ldquo;Add QR Code&rdquo; to create your first one.
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>QR Code</TableHead>
            <TableHead>Scanned</TableHead>
            <TableHead>Distribution point</TableHead>
            <TableHead>Leads to</TableHead>
            <TableHead>Downloads</TableHead>
            <TableHead className="sr-only">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {qrCodes.map((qrCode) => (
            <QrCodeRow key={qrCode.id} qrCode={qrCode} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export type { QrCodeRowData }
