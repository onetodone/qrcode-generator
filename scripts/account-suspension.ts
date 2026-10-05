import { QrDisabledReason } from '../prisma/generated/client'
import { hashFromInput, notifyOwner, prisma, runOperatorScript } from './operator'

// Suspends an account that breaks the Terms of Use, or lifts the suspension.

const USAGE = `Usage:
  pnpm user:suspend <email|hash|link>     Suspend the account and disable its enabled codes
  pnpm user:unsuspend <email|hash|link>   Lift the suspension and the disables it caused`

async function findUser(target: string) {
  if (target.includes('@') && !target.includes('/')) {
    return prisma.user.findUnique({
      where: { email: target },
      select: { id: true, email: true, name: true, suspendedAt: true },
    })
  }

  const code = await prisma.qrCode.findUnique({
    where: { urlHash: hashFromInput(target) },
    select: { user: { select: { id: true, email: true, name: true, suspendedAt: true } } },
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

  if (command === 'unsuspend') {
    const { count } = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { suspendedAt: null } })
      return tx.qrCode.updateMany({
        where: { userId: user.id, disabledReason: QrDisabledReason.ACCOUNT_SUSPENDED },
        data: { disabledAt: null, disabledReason: null },
      })
    })
    console.log(`Unsuspended ${user.email}; updated ${count} QR code(s).`)
    console.log('Running app instances may serve cached redirects for up to 60 s.')
    return
  }

  if (user.suspendedAt) {
    console.log(`${user.email} is already suspended.`)
    return
  }

  const disabledAt = new Date()
  const codes = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { suspendedAt: disabledAt } })
    await tx.qrCode.updateMany({
      where: { userId: user.id, disabledAt: null },
      data: { disabledAt, disabledReason: QrDisabledReason.ACCOUNT_SUSPENDED },
    })
    return tx.qrCode.findMany({
      where: { userId: user.id, disabledAt, disabledReason: QrDisabledReason.ACCOUNT_SUSPENDED },
      select: { id: true, note: true, urlHash: true, leadsTo: true },
      orderBy: { createdAt: 'asc' },
    })
  })

  console.log(`Suspended ${user.email}; updated ${codes.length} QR code(s).`)
  console.log('Running app instances may serve cached redirects for up to 60 s.')

  await notifyOwner(user, QrDisabledReason.ACCOUNT_SUSPENDED, codes)
}

runOperatorScript(main)
