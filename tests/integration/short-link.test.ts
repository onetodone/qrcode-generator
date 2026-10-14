import { describe, expect, test, vi } from 'vitest'
import { GET } from '@/app/s/[hash]/route'
import { prisma } from '@/lib/prisma'
import { invalidateRedirect } from '@/lib/redirect-cache'
import { createQrCode, createUser } from './helpers/db'
import { flushAfter } from './helpers/after'
import { emailsOf } from './helpers/mailer'
import { isNotFound } from './helpers/navigation'
import { safeBrowsingResponse } from '../helpers/safe-browsing'

const BROWSER = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'

function scan(hash: string, headers: Record<string, string> = {}, method = 'GET') {
  const request = new Request(`http://s.localhost:3000/s/${hash}`, {
    method,
    headers: { 'user-agent': BROWSER, 'x-forwarded-for': '203.0.113.5', ...headers },
  })
  return GET(request, { params: Promise.resolve({ hash }) })
}

async function viewsOf(urlHash: string): Promise<number> {
  return (await prisma.qrCode.findUniqueOrThrow({ where: { urlHash } })).views
}

describe('/s/<hash>', () => {
  test('redirects to the destination and counts the scan', async () => {
    const user = await createUser()
    const code = await createQrCode(user.id, { leadsTo: 'https://example.com/landing?a=1' })

    const response = await scan(code.urlHash)
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://example.com/landing?a=1')

    await flushAfter()
    expect(await viewsOf(code.urlHash)).toBe(1)
  })

  test('redirects to mailto: and tel: destinations', async () => {
    const user = await createUser()
    const code = await createQrCode(user.id, { leadsTo: 'tel:+15551234567' })
    expect((await scan(code.urlHash)).headers.get('location')).toBe('tel:+15551234567')
  })

  test.each([
    ['a crawler', { 'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' }],
    ['a link preview', { 'user-agent': 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)' }],
    ['a prefetch', { 'sec-purpose': 'prefetch;prerender' }],
  ])('redirects %s without counting it', async (_, headers) => {
    const user = await createUser()
    const code = await createQrCode(user.id)
    expect((await scan(code.urlHash, headers)).status).toBe(307)
    await flushAfter()
    expect(await viewsOf(code.urlHash)).toBe(0)
  })

  test('sends a disabled code to /link-disabled without counting it', async () => {
    const user = await createUser()
    const code = await createQrCode(user.id, { disabledAt: new Date() })
    const response = await scan(code.urlHash)
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('/link-disabled')
    await flushAfter()
    expect(await viewsOf(code.urlHash)).toBe(0)
  })

  test('is 404 for an unknown hash', async () => {
    expect(await isNotFound(scan('unknown'))).toBe(true)
  })

  test('serves an edited destination once the cache entry is invalidated', async () => {
    const user = await createUser()
    const code = await createQrCode(user.id, { leadsTo: 'https://old.example/' })
    await scan(code.urlHash)

    await prisma.qrCode.update({ where: { id: code.id }, data: { leadsTo: 'https://new.example/' } })
    expect((await scan(code.urlHash)).headers.get('location')).toBe('https://old.example/')
    invalidateRedirect(code.urlHash)
    expect((await scan(code.urlHash)).headers.get('location')).toBe('https://new.example/')
  })

  test('limits scans to 60 a minute per IP', async () => {
    const user = await createUser()
    const code = await createQrCode(user.id)
    for (let i = 0; i < 60; i++) expect((await scan(code.urlHash)).status).toBe(307)

    const limited = await scan(code.urlHash)
    expect(limited.status).toBe(429)
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0)
    expect((await scan(code.urlHash, { 'x-forwarded-for': '203.0.113.6' })).status).toBe(307)
  })

  test('disables a code whose destination Safe Browsing flags on a recheck, and tells the owner', async () => {
    vi.stubEnv('SAFE_BROWSING_API_KEY', 'key')
    vi.stubGlobal('fetch', async () => safeBrowsingResponse('https://evil.example/', [2]))
    try {
      const user = await createUser()
      const code = await createQrCode(user.id, { leadsTo: 'https://evil.example/' })

      expect((await scan(code.urlHash)).headers.get('location')).toBe('https://evil.example/')
      await flushAfter()

      const stored = await prisma.qrCode.findUniqueOrThrow({ where: { id: code.id } })
      expect(stored.disabledReason).toBe('UNSAFE_DESTINATION')
      expect(stored.destinationCheckedAt).not.toBeNull()
      expect((await scan(code.urlHash)).headers.get('location')).toBe('/link-disabled')
      expect(emailsOf('codeDisabled', user.email)).toHaveLength(1)
    } finally {
      vi.unstubAllEnvs()
      vi.unstubAllGlobals()
    }
  })
})
