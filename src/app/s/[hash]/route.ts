import { after, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/client'
import { logRequest } from '@/lib/logger'
import { clientIpFromHeaders } from '@/lib/request'

export async function GET(_request: Request, { params }: { params: Promise<{ hash: string }> }) {
  const start = performance.now()
  const { hash } = await params
  const requestHeaders = await headers()

  let status = 500
  after(() => {
    logRequest({
      method: 'GET',
      path: `/s/${hash}`,
      ip: clientIpFromHeaders(requestHeaders),
      status,
      durationMs: performance.now() - start,
    })
  })

  try {
    const qrCode = await prisma.qrCode.update({
      where: { urlHash: hash },
      data: { views: { increment: 1 } },
    })

    status = 307
    return NextResponse.redirect(qrCode.leadsTo)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      status = 404
      notFound()
    }
    throw error
  }
}
