'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import type { QrKindValue, QrShapeValue } from '@/schemas/qrcode'
import type { QrDisabledReason } from '@/generated/enums'
import { randomToken } from '@/lib/random'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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
import { QrImage } from '@/components/qrcode/qr-image'
import { QrDisabledBadge } from '@/components/qrcode/qr-disabled-notice'
import { deleteQrCodeAction } from '@/actions/qrcode'

// High enough resolution for print materials (posters, booklets).
const DOWNLOAD_SIZE = 1024
// Close to lossless, so module edges stay sharp for scanners.
const JPEG_QUALITY = 0.95

export type QrCodeCardData = {
  id: string
  kind: QrKindValue
  note: string
  leadsTo: string
  shape: QrShapeValue
  fgColor: string
  bgColor: string
  views: number
  disabledReason: QrDisabledReason | null
  /** What the image encodes: the short link, or the endpoint of a direct code. */
  qrContent: string
}

function triggerDownload(href: string, filename: string) {
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function downloadClone(svg: SVGSVGElement, { transparent = false } = {}): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('width', String(DOWNLOAD_SIZE))
  clone.setAttribute('height', String(DOWNLOAD_SIZE))
  if (transparent) clone.querySelector('[data-qr-background]')?.remove()
  return clone
}

function svgBlob(svg: SVGSVGElement): Blob {
  return new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' })
}

export function QrCodeCard({ qrCode }: { qrCode: QrCodeCardData }) {
  const isDirect = qrCode.kind === 'DIRECT'
  const svgRef = useRef<SVGSVGElement>(null)
  const [downloadName] = useState(() => `qrcode-${randomToken(8)}`)

  function handleDownloadSvg() {
    const svg = svgRef.current
    if (!svg) return

    const url = URL.createObjectURL(svgBlob(downloadClone(svg)))
    triggerDownload(url, `${downloadName}.svg`)
    URL.revokeObjectURL(url)
  }

  function downloadRaster(type: 'image/png' | 'image/jpeg', extension: string, transparent: boolean) {
    const svg = svgRef.current
    if (!svg) return

    const url = URL.createObjectURL(svgBlob(downloadClone(svg, { transparent })))
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = DOWNLOAD_SIZE
      canvas.height = DOWNLOAD_SIZE
      const context = canvas.getContext('2d')
      if (context) {
        context.drawImage(image, 0, 0, DOWNLOAD_SIZE, DOWNLOAD_SIZE)
        triggerDownload(canvas.toDataURL(type, JPEG_QUALITY), `${downloadName}.${extension}`)
      }
      URL.revokeObjectURL(url)
    }
    image.onerror = () => URL.revokeObjectURL(url)
    image.src = url
  }

  return (
    <Card className="px-4">
      <div className="flex items-start gap-3">
        <QrImage
          ref={svgRef}
          value={qrCode.qrContent}
          shape={qrCode.shape}
          fgColor={qrCode.fgColor}
          bgColor={qrCode.bgColor}
          size={92}
          className="shrink-0 rounded-md ring-1 ring-foreground/10"
        />
        <div className="min-w-0 h-full flex flex-col flex-1">
          {qrCode.disabledReason ? (
            <p title={qrCode.leadsTo} className="truncate font-medium text-muted-foreground line-through">
              {qrCode.leadsTo}
            </p>
          ) : (
            <a
              href={qrCode.leadsTo}
              target="_blank"
              rel="noreferrer"
              title={qrCode.leadsTo}
              className="block truncate font-medium text-primary underline underline-offset-4"
            >
              {qrCode.leadsTo}
            </a>
          )}
          <p title={qrCode.note || undefined} className="mt-0.5 mb-2 line-clamp-2 text-muted-foreground">
            {qrCode.note || '-'}
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {isDirect ? (
              <Badge
                variant="secondary"
                title="Direct code: opens the endpoint without this site, so scans aren’t counted."
              >
                No tracking
              </Badge>
            ) : (
              <p>
                <strong>{qrCode.views}</strong> {qrCode.views === 1 ? 'scan' : 'scans'}
              </p>
            )}
            {qrCode.disabledReason && <QrDisabledBadge reason={qrCode.disabledReason} />}
          </div>
        </div>
      </div>
      <Separator className="my-1" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadSvg}>
            SVG
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            title="PNG with a transparent background"
            onClick={() => downloadRaster('image/png', 'png', true)}
          >
            PNG
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => downloadRaster('image/jpeg', 'jpg', false)}>
            JPG
          </Button>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            nativeButton={false}
            aria-label="Edit QR code"
            render={<Link href={`/qrcodes/${qrCode.id}/edit`} />}
          >
            <PencilIcon />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Delete QR code" />}>
              <Trash2Icon />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this QR code?</AlertDialogTitle>
                <AlertDialogDescription>
                  {isDirect
                    ? 'This permanently removes the code from your dashboard. Printed copies keep opening the endpoint, since it’s encoded in the image. This can’t be undone.'
                    : 'This permanently removes the code. Anyone who scans it afterwards will get a 404. This can’t be undone.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <form action={deleteQrCodeAction.bind(null, qrCode.id)} className="contents">
                  <SubmitButton data-slot="alert-dialog-action" variant="destructive" pendingLabel="Deleting...">
                    Delete
                  </SubmitButton>
                </form>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Card>
  )
}
