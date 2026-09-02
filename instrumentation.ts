import type { Instrumentation } from 'next'
import { installConsoleMasking, logger } from '@/lib/logger'

export function register(): void {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'production') {
    installConsoleMasking()
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
