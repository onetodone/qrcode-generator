import { NextResponse } from 'next/server'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/client'

export async function GET(_request: Request, { params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params

  try {
    const qrCode = await prisma.qrCode.update({
      where: { urlHash: hash },
      data: { views: { increment: 1 } },
    })

    return NextResponse.redirect(qrCode.leadsTo)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      notFound()
    }
    throw error
  }
}
