import { after } from 'next/server'
import { logger } from '@/lib/logger'

/** Runs `task` after the response is sent; a failure is only logged under `event`, with `context`. */
export function afterResponse(event: string, task: () => Promise<unknown>, context?: Record<string, unknown>): void {
  after(async () => {
    try {
      await task()
    } catch (error) {
      logger.error(event, { ...context, error })
    }
  })
}
