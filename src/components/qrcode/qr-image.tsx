import type { Ref } from 'react'
import type { QrShapeValue } from '@/schemas/qrcode'
import { isStructuralModule, QR_MARGIN_MODULES, qrModules } from '@/lib/qr-matrix'

export type QrImageProps = {
  value: string
  shape: QrShapeValue
  fgColor: string
  bgColor: string
  size?: number
  marginModules?: number
  title?: string
  className?: string
  ref?: Ref<SVGSVGElement>
}

// Decorative (data-module) geometry, in module units.
// DOTS  — a separated circle per module, small enough to leave a visible gap.
// ROUNDED — a full-bleed square with strongly rounded corners, so neighbouring
//           modules join into soft blobs (clearly distinct from DOTS).
const DOT_RADIUS = 0.4
const ROUNDED_BLEED = 0.02
const ROUNDED_RADIUS = 0.3

export function QrImage({
  value,
  shape,
  fgColor,
  bgColor,
  size = 64,
  marginModules = QR_MARGIN_MODULES,
  title,
  className,
  ref,
}: QrImageProps) {
  const modules = qrModules(value)
  const count = modules.length
  const dimension = count + marginModules * 2

  const squareRuns: string[] = []
  const decorations: React.ReactNode[] = []

  for (let row = 0; row < count; row++) {
    let runStart: number | null = null

    const flushRun = (end: number) => {
      if (runStart === null) return
      const length = end - runStart
      squareRuns.push(`M${runStart + marginModules} ${row + marginModules}h${length}v1h-${length}z`)
      runStart = null
    }

    for (let col = 0; col < count; col++) {
      const dark = modules[row][col]
      const asSquare = dark && (shape === 'SQUARE' || isStructuralModule(row, col, count))

      if (asSquare) {
        if (runStart === null) runStart = col
      } else {
        flushRun(col)
      }

      if (dark && !asSquare) {
        const x = col + marginModules
        const y = row + marginModules
        if (shape === 'DOTS') {
          decorations.push(<circle key={`${row}-${col}`} cx={x + 0.5} cy={y + 0.5} r={DOT_RADIUS} />)
        } else {
          decorations.push(
            <rect
              key={`${row}-${col}`}
              x={x - ROUNDED_BLEED}
              y={y - ROUNDED_BLEED}
              width={1 + ROUNDED_BLEED * 2}
              height={1 + ROUNDED_BLEED * 2}
              rx={ROUNDED_RADIUS}
            />,
          )
        }
      }
    }

    flushRun(count)
  }

  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox={`0 0 ${dimension} ${dimension}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title ?? 'QR code'}
      className={className}
    >
      {title ? <title>{title}</title> : null}
      <rect width={dimension} height={dimension} fill={bgColor} />
      <g fill={fgColor}>
        {squareRuns.length > 0 ? <path d={squareRuns.join('')} shapeRendering="crispEdges" /> : null}
        {decorations}
      </g>
    </svg>
  )
}
