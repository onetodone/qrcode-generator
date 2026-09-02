import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { updateQrCodeAction } from '@/actions/qrcode'
import { QrCodeForm } from '@/components/qrcode/qr-code-form'

export const metadata: Metadata = {
  title: 'Edit QR Code',
}

export default async function EditQrCodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [session, requestHeaders] = await Promise.all([auth(), headers()])
  if (!session?.user?.id) {
    redirect('/login')
  }

  const qrCode = await prisma.qrCode.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!qrCode) {
    notFound()
  }

  const proto = requestHeaders.get('x-forwarded-proto') ?? 'http'
  const host = requestHeaders.get('host')
  const previewValue = `${proto}://${host}/s/${qrCode.urlHash}`

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Edit QR Code</h1>
        <p className="text-sm text-muted-foreground">
          Update the endpoint, note, and design. The tracking link stays the same, so printed codes keep working.
        </p>
      </div>
      <QrCodeForm
        action={updateQrCodeAction}
        hiddenId={qrCode.id}
        submitLabel="Save changes"
        pendingLabel="Saving..."
        successMessage="QR code updated."
        previewValue={previewValue}
        defaultValues={{
          leadsTo: qrCode.leadsTo,
          note: qrCode.note,
          shape: qrCode.shape,
          fgColor: qrCode.fgColor,
          bgColor: qrCode.bgColor,
        }}
      />
    </div>
  )
}
