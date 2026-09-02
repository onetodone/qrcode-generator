import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { createQrCodeAction } from '@/actions/qrcode'
import { QrCodeForm } from '@/components/qrcode/qr-code-form'

export const metadata: Metadata = {
  title: 'New QR Code',
}

// A fixed 32-char stand-in (the real hash length) so the preview's module
// density matches the code that will actually be generated on save.
const SAMPLE_HASH = 'abcdefghijklmnopqrstuvwxyz012345'

export default async function NewQrCodePage() {
  const [session, requestHeaders] = await Promise.all([auth(), headers()])
  if (!session?.user?.id) {
    redirect('/login')
  }

  const proto = requestHeaders.get('x-forwarded-proto') ?? 'http'
  const host = requestHeaders.get('host')
  const previewValue = `${proto}://${host}/s/${SAMPLE_HASH}`

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold">New QR Code</h1>
        <p className="text-sm text-muted-foreground">Create a new tracked QR code.</p>
      </div>
      <QrCodeForm
        action={createQrCodeAction}
        submitLabel="Create QR Code"
        pendingLabel="Creating..."
        successMessage="QR code created."
        previewValue={previewValue}
      />
    </div>
  )
}
