import { PlusIcon } from 'lucide-react'
import { createQrCodeAction } from '@/actions/qrcode'
import { Button } from '@/components/ui/button'
import { QrCodeFormDialog } from '@/components/qrcode/qrcode-form-dialog'

export function AddQrCodeDialog() {
  return (
    <QrCodeFormDialog
      triggerElement={<Button />}
      triggerContent={
        <>
          <PlusIcon />
          Add QR Code
        </>
      }
      title="Add QR Code"
      description="Create a new tracked QR code for a distribution point."
      submitLabel="Add QR Code"
      pendingLabel="Adding..."
      successMessage="QR code created."
      action={createQrCodeAction}
    />
  )
}
