import { after, NextResponse } from 'next/server'
import { notFound } from 'next/navigation'
import { isbot } from 'isbot'
import { prisma } from '@/lib/prisma'
import { logger, logRequest } from '@/lib/logger'
import { clientIpFromHeaders, isPrefetchRequest } from '@/lib/request'
import { rateLimit, tooManyAttemptsMessage } from '@/lib/rate-limit'
import { getCachedRedirect, redirectCacheGeneration, setCachedRedirect } from '@/lib/redirect-cache'
import { isRecheckDue, recheckDestination } from '@/lib/destination-safety'

const REDIRECT_RATE_LIMIT = { limit: 60, windowMs: 60_000 }
const DISABLED_LINK_PATH = '/link-disabled'

export async function GET(request: Request, { params }: { params: Promise<{ hash: string }> }) {
  const start = performance.now()
  const { hash } = await params
  const ip = clientIpFromHeaders(request.headers)

  let status = 500
  after(() => {
    logRequest({
      method: request.method,
      path: `/s/${hash}`,
      ip,
      status,
      durationMs: performance.now() - start,
    })
  })

  const limited = rateLimit(`qr-redirect:${ip}`, REDIRECT_RATE_LIMIT)
  if (!limited.ok) {
    status = 429
    return new NextResponse(tooManyAttemptsMessage(limited.retryAfterMs), {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(limited.retryAfterMs / 1000)) },
    })
  }

  let target = getCachedRedirect(hash)
  if (target === undefined) {
    const generation = redirectCacheGeneration()
    const qrCode = await prisma.qrCode.findUnique({
      where: { urlHash: hash },
      select: { urlHash: true, leadsTo: true, disabledAt: true, destinationSetAt: true, destinationCheckedAt: true },
    })

    if (!qrCode) {
      status = 404
      notFound()
    }

    target = { leadsTo: qrCode.leadsTo, disabled: qrCode.disabledAt !== null }
    setCachedRedirect(hash, target, generation)

    if (isRecheckDue(qrCode)) {
      after(() => recheckDestination(qrCode))
    }
  }

  status = 307

  if (target.disabled) {
    return new NextResponse(null, { status, headers: { Location: DISABLED_LINK_PATH } })
  }

  const isRealScan =
    request.method === 'GET' && !isPrefetchRequest(request.headers) && !isbot(request.headers.get('user-agent') ?? '')
  if (isRealScan) {
    after(async () => {
      try {
        await prisma.qrCode.update({
          where: { urlHash: hash },
          data: { views: { increment: 1 } },
        })
      } catch (error) {
        logger.error('qr.view_increment_failed', { error, hash })
      }
    })
  }

  return NextResponse.redirect(target.leadsTo)
}
