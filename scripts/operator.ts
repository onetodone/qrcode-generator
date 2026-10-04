import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../prisma/generated/client'

// `DATABASE_URL` from the environment wins over `.env`, so operator scripts can point at production.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

export const prisma = new PrismaClient({ adapter })

/** The hash of a `/s/<hash>` link, or the input itself when it isn't a link. */
export function hashFromInput(input: string): string {
  try {
    const match = new URL(input).pathname.match(/^\/s\/([^/]+)/)
    if (match?.[1]) return match[1]
  } catch {
    // Not a URL: treat it as a bare hash.
  }
  return input
}

/** Runs an operator command, sets a failing exit code on error, and disconnects from the database. */
export function runOperatorScript(main: () => Promise<void>): void {
  main()
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
