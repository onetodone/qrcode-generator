import { afterAll, beforeEach, vi } from 'vitest'
import { cookieStore, requestHeaders, resetRequest } from './helpers/request'
import { after, clearAfter } from './helpers/after'
import { fakeMailer, resetMailer } from './helpers/mailer'

vi.mock('next/headers', () => ({
  headers: async () => requestHeaders(),
  cookies: async () => cookieStore(),
}))

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after,
}))

vi.mock('next/cache', () => ({
  revalidatePath: () => {},
}))

vi.mock('@/lib/email', () => ({
  getMailer: () => fakeMailer,
}))

// The logger keeps the console methods it finds when loaded, so they are
// silenced before anything imports it.
const consoleSpies = (['log', 'warn', 'error'] as const).map((method) =>
  vi.spyOn(console, method).mockImplementation(() => {}),
)

const { prisma } = await import('@/lib/prisma')
const { truncateAll } = await import('./helpers/db')

const memoryState = globalThis as unknown as {
  rateLimitBuckets?: Map<string, unknown>
  redirectCache?: { entries: Map<string, unknown> }
}

beforeEach(async () => {
  await truncateAll()
  memoryState.rateLimitBuckets?.clear()
  memoryState.redirectCache?.entries.clear()
  resetRequest()
  resetMailer()
  clearAfter()
  consoleSpies.forEach((spy) => spy.mockClear())
})

afterAll(async () => {
  await prisma.$disconnect()
})
