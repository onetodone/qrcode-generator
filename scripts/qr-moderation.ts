import { QrDisabledReason } from '../prisma/generated/client'
import { hashFromInput, prisma, runOperatorScript } from './operator'

// Disables or re-enables QR codes by hand, e.g. after an abuse report.

const USAGE = `Usage:
  pnpm qr:disable <hash|link> [--owner]   Disable the code, or with --owner every code of its owner
  pnpm qr:enable <hash|link> [--owner]    Lift a manual disable`

async function main() {
  const [command, target, ...flags] = process.argv.slice(2)
  if ((command !== 'disable' && command !== 'enable') || !target) {
    console.error(USAGE)
    process.exitCode = 1
    return
  }

  const hash = hashFromInput(target)
  const code = await prisma.qrCode.findUnique({
    where: { urlHash: hash },
    select: { userId: true, user: { select: { email: true } } },
  })
  if (!code) {
    console.error(`No QR code with hash ${hash}.`)
    process.exitCode = 1
    return
  }

  const scope = flags.includes('--owner') ? { userId: code.userId } : { urlHash: hash }
  const { count } =
    command === 'disable'
      ? await prisma.qrCode.updateMany({
          where: scope,
          data: { disabledAt: new Date(), disabledReason: QrDisabledReason.MANUAL },
        })
      : await prisma.qrCode.updateMany({
          where: { ...scope, disabledReason: QrDisabledReason.MANUAL },
          data: { disabledAt: null, disabledReason: null },
        })

  console.log(`${command === 'disable' ? 'Disabled' : 'Enabled'} ${count} QR code(s) owned by ${code.user.email}.`)
  console.log('Running app instances may serve cached redirects for up to 60 s.')
}

runOperatorScript(main)
