import { after, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { isbot } from 'isbot'
import { prisma } from '@/lib/prisma'
import { logger, logRequest } from '@/lib/logger'
import { clientIpFromHeaders } from '@/lib/request'

export async function GET(request: Request, { params }: { params: Promise<{ hash: string }> }) {
  const start = performance.now()
  const { hash } = await params
  const requestHeaders = await headers()

  let status = 500
  after(() => {
    logRequest({
      method: request.method,
      path: `/s/${hash}`,
      ip: clientIpFromHeaders(requestHeaders),
      status,
      durationMs: performance.now() - start,
    })
  })

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
