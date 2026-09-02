import { PrismaClient } from '@/generated/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { logger } from '@/lib/logger'

const SLOW_QUERY_THRESHOLD_MS = 200

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

function createPrismaClient() {
  const client = new PrismaClient({ adapter })

  return client.$extends({
    query: {
      $allOperations: async ({ operation, model, args, query }) => {
        const start = performance.now()
        const result = await query(args)
        const durationMs = performance.now() - start

        if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
          logger.warn('prisma.slow_query', { model: model ?? 'raw', operation, durationMs: Math.round(durationMs) })
        }

        return result
      },
    },
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
