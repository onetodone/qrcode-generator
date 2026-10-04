import { QrDisabledReason } from '../prisma/generated/client'
import { hashFromInput, prisma, runOperatorScript } from './operator'

// Suspends an account that breaks the Terms of Use, or lifts the suspension.

const USAGE = `Usage:
  pnpm user:suspend <email|hash|link>     Suspend the account and disable its enabled codes
  pnpm user:unsuspend <email|hash|link>   Lift the suspension and the disables it caused`

async function findUser(target: string) {
  if (target.includes('@') && !target.includes('/')) {
    return prisma.user.findUnique({ where: { email: target }, select: { id: true, email: true } })
  }

  const code = await prisma.qrCode.findUnique({
    where: { urlHash: hashFromInput(target) },
    select: { user: { select: { id: true, email: true } } },
  })
  return code?.user ?? null
}

async function main() {
  const [command, target] = process.argv.slice(2)
  if ((command !== 'suspend' && command !== 'unsuspend') || !target) {
    console.error(USAGE)
    process.exitCode = 1
    return
  }

  const user = await findUser(target)
  if (!user) {
    console.error(`No account found for ${target}.`)
    process.exitCode = 1
    return
  }

  const { count } = await prisma.$transaction(async (tx) => {
    if (command === 'suspend') {
      await tx.user.update({ where: { id: user.id }, data: { suspendedAt: new Date() } })
      return tx.qrCode.updateMany({
        where: { userId: user.id, disabledAt: null },
        data: { disabledAt: new Date(), disabledReason: QrDisabledReason.ACCOUNT_SUSPENDED },
      })
    }

    await tx.user.update({ where: { id: user.id }, data: { suspendedAt: null } })
    return tx.qrCode.updateMany({
      where: { userId: user.id, disabledReason: QrDisabledReason.ACCOUNT_SUSPENDED },
      data: { disabledAt: null, disabledReason: null },
    })
  })

  console.log(`${command === 'suspend' ? 'Suspended' : 'Unsuspended'} ${user.email}; updated ${count} QR code(s).`)
  console.log('Running app instances may serve cached redirects for up to 60 s.')
}

runOperatorScript(main)
