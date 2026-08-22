'use client'

import { useRef } from 'react'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import { TableCell, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { QrCodeFormDialog } from '@/components/qrcode/qrcode-form-dialog'
import { deleteQrCodeAction, updateQrCodeAction } from '@/actions/qrcode'

// High enough resolution for print materials (posters, booklets).
const DOWNLOAD_SIZE = 1024

export type QrCodeRowData = {
  id: string
  urlHash: string
  note: string
  leadsTo: string
  views: number
  redirectUrl: string
}

function triggerDownload(href: string, filename: string) {
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function QrCodeRow({ qrCode }: { qrCode: QrCodeRowData }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  function handleDownloadSvg() {
    const svg = svgRef.current
    if (!svg) return

    // SVG is resolution-independent, so upsizing the exported copy is free.
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute('width', String(DOWNLOAD_SIZE))
    clone.setAttribute('height', String(DOWNLOAD_SIZE))

    const serialized = new XMLSerializer().serializeToString(clone)
    const blob = new Blob([serialized], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    triggerDownload(url, `qrcode-${qrCode.urlHash}.svg`)
    URL.revokeObjectURL(url)
  }

  function handleDownloadPng() {
    const canvas = canvasRef.current
    if (!canvas) return
    triggerDownload(canvas.toDataURL('image/png'), `qrcode-${qrCode.urlHash}.png`)
  }

  return (
    <TableRow>
      <TableCell>
        <QRCodeSVG ref={svgRef} value={qrCode.redirectUrl} size={64} marginSize={1} />
        {/* Hidden high-res canvas, rendered off-screen purely for PNG export. */}
        <div style={{ display: 'none' }} aria-hidden>
          <QRCodeCanvas
            ref={canvasRef}
            value={qrCode.redirectUrl}
            size={DOWNLOAD_SIZE}
            marginSize={1}
            bgColor="#FFFFFF00"
          />
        </div>
      </TableCell>
      <TableCell>{qrCode.views}</TableCell>
      <TableCell className="max-w-64 whitespace-normal break-words">
        <a href={qrCode.leadsTo} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
          {qrCode.leadsTo}
        </a>
      </TableCell>
      <TableCell className="max-w-48 whitespace-normal break-words">{qrCode.note || '-'}</TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadSvg}>
            SVG
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadPng}>
            PNG
          </Button>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <QrCodeFormDialog
            triggerElement={<Button variant="ghost" size="icon-sm" aria-label="Edit QR code" />}
            triggerContent={<PencilIcon />}
            title="Edit QR Code"
            description="Update where this code points. The QR image itself stays the same."
            submitLabel="Save changes"
            pendingLabel="Saving..."
            successMessage="QR code updated."
            action={updateQrCodeAction}
            defaultValues={{ leadsTo: qrCode.leadsTo, note: qrCode.note }}
            hiddenId={qrCode.id}
          />
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Delete QR code" />}>
              <Trash2Icon />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this QR code?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the code for &ldquo;{qrCode.note}&rdquo;. Anyone who scans it afterwards will
                  get a 404. This can&rsquo;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <form action={deleteQrCodeAction.bind(null, qrCode.id)} className="contents">
                  <SubmitButton data-slot="alert-dialog-action" variant="destructive" pendingLabel="Deleting...">
                    Delete
                  </SubmitButton>
                </form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  )
}
