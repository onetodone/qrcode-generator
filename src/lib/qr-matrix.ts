import qrcode from 'qrcode-generator'

// Error correction level used for every code we render. Deliberately higher than
// the strict minimum: decorative module shapes (rounded / dots) lose a little
// edge contrast, so the extra redundancy of level "Q" keeps them scannable.
// Kept constant across shapes so the module matrix — and its visual density —
// is identical between the form preview and the saved code.
export const QR_LEVEL = 'Q' as const

// Modules of margin (quiet zone) rendered around the matrix. The spec calls for
// 4; some scanners are unforgiving with less, especially for styled codes.
export const QR_MARGIN_MODULES = 4

/**
 * Build the QR module matrix for `value` as a 2D boolean grid (`true` = dark).
 * Pure and dependency-light — safe to call on the server or the client.
 */
export function qrModules(value: string): boolean[][] {
  const qr = qrcode(0, QR_LEVEL)
  qr.addData(value)
  qr.make()

  const count = qr.getModuleCount()
  const rows: boolean[][] = []
  for (let row = 0; row < count; row++) {
    const cells: boolean[] = []
    for (let col = 0; col < count; col++) {
      cells.push(qr.isDark(row, col))
    }
    rows.push(cells)
  }
  return rows
}

// Alignment-pattern centre coordinates per QR version (index = version), from
// ISO/IEC 18004. A pattern sits at every (row, col) pair of a version's list,
// except the three that would collide with the finder patterns.
const ALIGNMENT_CENTERS: readonly (readonly number[])[] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
  [6, 28, 50, 72, 94],
  [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122],
  [6, 30, 54, 78, 102, 126],
  [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162],
  [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170],
]

/**
 * Whether the module at (row, col) belongs to a QR *structural* pattern that
 * must stay solid for reliable scanning — the finder patterns and their
 * separators, the alignment patterns, and (for version ≥ 7) the
 * version-information blocks.
 *
 * These are drawn as squares regardless of the chosen shape. The timing
 * patterns (row 6 / column 6) are deliberately *not* included: keeping them
 * square left an obvious dashed line of squares running through a dots/rounded
 * code, and decoders lock on fine without it (finder + alignment carry the
 * grid). Everything else — data modules and timing — takes the decorative shape.
 */
export function isStructuralModule(row: number, col: number, count: number): boolean {
  // Finder patterns + separators (8×8 blocks at three corners).
  if (row < 8 && col < 8) return true
  if (row < 8 && col >= count - 8) return true
  if (row >= count - 8 && col < 8) return true

  const version = (count - 17) / 4

  // Version-information blocks (6×3 / 3×6), only present from version 7.
  if (version >= 7) {
    if (row < 6 && col >= count - 11 && col < count - 8) return true
    if (col < 6 && row >= count - 11 && row < count - 8) return true
  }

  // Alignment patterns (5×5 around each centre).
  const centers = ALIGNMENT_CENTERS[version]
  if (centers && centers.length > 0) {
    const first = centers[0]
    const last = centers[centers.length - 1]
    for (const ar of centers) {
      for (const ac of centers) {
        const collidesWithFinder =
          (ar === first && ac === first) || (ar === first && ac === last) || (ar === last && ac === first)
        if (collidesWithFinder) continue
        if (Math.abs(row - ar) <= 2 && Math.abs(col - ac) <= 2) return true
      }
    }
  }

  return false
}
