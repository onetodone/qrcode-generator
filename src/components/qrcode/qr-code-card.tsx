'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import type { QrShapeValue } from '@/schemas/qrcode'
import { randomToken } from '@/lib/random'
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
import { deleteQrCodeAction } from '@/actions/qrcode'

// High enough resolution for print materials (posters, booklets).
const DOWNLOAD_SIZE = 1024

export type QrCodeCardData = {
  id: string
  urlHash: string
  note: string
  leadsTo: string
  shape: QrShapeValue
  fgColor: string
  bgColor: string
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

function upscaledClone(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('width', String(DOWNLOAD_SIZE))
  clone.setAttribute('height', String(DOWNLOAD_SIZE))
  return clone
}

export function QrCodeCard({ qrCode }: { qrCode: QrCodeCardData }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [downloadName] = useState(() => `qrcode-${randomToken(8)}`)

  function handleDownloadSvg() {
    const svg = svgRef.current
    if (!svg) return

    const serialized = new XMLSerializer().serializeToString(upscaledClone(svg))
    const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    triggerDownload(url, `${downloadName}.svg`)
    URL.revokeObjectURL(url)
  }

  function handleDownloadPng() {
    const svg = svgRef.current
    if (!svg) return

    const serialized = new XMLSerializer().serializeToString(upscaledClone(svg))
    const url = URL.createObjectURL(new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' }))
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = DOWNLOAD_SIZE
      canvas.height = DOWNLOAD_SIZE
      const context = canvas.getContext('2d')
      if (context) {
        context.drawImage(image, 0, 0, DOWNLOAD_SIZE, DOWNLOAD_SIZE)
        triggerDownload(canvas.toDataURL('image/png'), `${downloadName}.png`)
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
          value={qrCode.redirectUrl}
          shape={qrCode.shape}
          fgColor={qrCode.fgColor}
          bgColor={qrCode.bgColor}
          size={92}
          className="shrink-0 rounded-md ring-1 ring-foreground/10"
        />
        <div className="min-w-0 h-full flex flex-col flex-1">
          <a
            href={qrCode.leadsTo}
            target="_blank"
            rel="noreferrer"
            title={qrCode.leadsTo}
            className="block truncate font-medium text-primary underline underline-offset-4"
          >
            {qrCode.leadsTo}
          </a>
          <p title={qrCode.note || undefined} className="mt-0.5 mb-2 line-clamp-2 text-muted-foreground">
            {qrCode.note || '-'}
          </p>
          <p className="mt-auto text-sm text-muted-foreground">
            <strong>{qrCode.views}</strong> {qrCode.views === 1 ? 'scan' : 'scans'}
          </p>
        </div>
      </div>
      <Separator className="my-1" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadSvg}>
            SVG
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadPng}>
            PNG
          </Button>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            nativeButton={false}
            aria-label="Edit QR code"
            render={<Link href={`/qr-codes/${qrCode.id}/edit`} />}
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
                  This permanently removes the code. Anyone who scans it afterwards will get a 404. This can&rsquo;t be
                  undone.
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
      </div>
    </Card>
  )
}
