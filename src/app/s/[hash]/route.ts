import { after, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { isbot } from 'isbot'
import { prisma } from '@/lib/prisma'
import { logger, logRequest } from '@/lib/logger'
import { clientIpFromHeaders } from '@/lib/request'
import { rateLimit, tooManyAttemptsMessage } from '@/lib/rate-limit'

const REDIRECT_RATE_LIMIT = { limit: 60, windowMs: 60_000 }

export async function GET(request: Request, { params }: { params: Promise<{ hash: string }> }) {
  const start = performance.now()
  const { hash } = await params
  const requestHeaders = await headers()
  const ip = clientIpFromHeaders(requestHeaders)

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

  const qrCode = await prisma.qrCode.findUnique({
    where: { urlHash: hash },
    select: { leadsTo: true },
  })

  if (!qrCode) {
    status = 404
    notFound()
  }

  status = 307

  if (request.method === 'GET' && !isbot(requestHeaders.get('user-agent') ?? '')) {
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

  return NextResponse.redirect(qrCode.leadsTo)
}
