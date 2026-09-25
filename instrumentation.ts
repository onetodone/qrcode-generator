import type { Instrumentation } from 'next'
import { installConsoleMasking, logger } from '@/lib/logger'

export function register(): void {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.NODE_ENV === 'production') {
      installConsoleMasking()
    }

    // The import must sit inside this NEXT_RUNTIME check so the bundler drops
    // it from the Edge instrumentation bundle (Prisma needs Node built-ins).
    void import('@/lib/prisma').then(warmUpDatabasePool)
  }
}

async function warmUpDatabasePool({ prisma, DB_POOL_MIN }: typeof import('@/lib/prisma')): Promise<void> {
  try {
    await Promise.all(Array.from({ length: DB_POOL_MIN }, () => prisma.$queryRaw`SELECT 1`))
  } catch (error) {
    logger.warn('db.pool_warmup_failed', { error })
  }
}

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  logger.error('request.error', {
    error,
    path: request.path,
    method: request.method,
    routerKind: context.routerKind,
    routePath: context.routePath,
  })
}
