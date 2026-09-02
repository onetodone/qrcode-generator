'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import type { QrShapeValue } from '@/schemas/qrcode'
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
import { QrImage } from '@/components/qrcode/qr-image'
import { deleteQrCodeAction } from '@/actions/qrcode'

// High enough resolution for print materials (posters, booklets).
const DOWNLOAD_SIZE = 1024

export type QrCodeRowData = {
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

function randomFileToken(length = 8): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

export function QrCodeRow({ qrCode }: { qrCode: QrCodeRowData }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [downloadName] = useState(() => `qrcode-${randomFileToken()}`)

  function handleDownloadSvg() {
    const svg = svgRef.current
    if (!svg) return

    // SVG is resolution-independent, so upsizing the exported copy is free.
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
    <TableRow>
      <TableCell>
        <QrImage
          ref={svgRef}
          value={qrCode.redirectUrl}
          shape={qrCode.shape}
          fgColor={qrCode.fgColor}
          bgColor={qrCode.bgColor}
          size={64}
        />
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
