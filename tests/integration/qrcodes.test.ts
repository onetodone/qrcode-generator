import { afterEach, describe, expect, test, vi } from 'vitest'
import { createQrCodeAction, deleteQrCodeAction, updateQrCodeAction } from '@/actions/qrcode'
import { prisma } from '@/lib/prisma'
import { getCachedRedirect, redirectCacheGeneration, setCachedRedirect } from '@/lib/redirect-cache'
import { createDirectQrCode, createQrCode, createUser } from './helpers/db'
import { form } from './helpers/navigation'
import { signInAs } from './helpers/request'
import { safeBrowsingResponse } from '../helpers/safe-browsing'

function create(leadsTo: string, extra: Record<string, string> = {}) {
  return createQrCodeAction(undefined, form({ leadsTo, note: 'Flyer', ...extra }))
}

async function signedInUser(overrides: Parameters<typeof createUser>[0] = {}) {
  const user = await createUser(overrides)
  await signInAs(user.id)
  return user
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('creating a QR code', () => {
  test('stores the normalized destination with a fresh hash', async () => {
    const user = await signedInUser()
    expect(await create('example.com/menu', { shape: 'DOTS', fgColor: '#112233' })).toEqual({ success: true })

    const [code] = await prisma.qrCode.findMany({ where: { userId: user.id } })
    expect(code).toMatchObject({
      leadsTo: 'https://example.com/menu',
      note: 'Flyer',
      shape: 'DOTS',
      fgColor: '#112233',
    })
    expect(code?.urlHash).toMatch(/^[a-z0-9]{32}$/)
  })

  test.each([
    ['not a destination', 'asdf', 'Endpoint must be a valid URL, phone number, or email address.'],
    ['a script URL', 'javascript:alert(1)', 'Endpoint must be a valid URL, phone number, or email address.'],
    [
      'credentials in the URL',
      'https://bank.com@evil.example/',
      'Endpoint can’t contain a username or password (user@host).',
    ],
    ['an IP address host', 'http://192.168.1.1/admin', 'Use a domain name, not an IP address.'],
    ['a URL shortener', 'https://bit.ly/abc', 'Links through URL shorteners aren’t allowed. Use the final address.'],
    [
      'another code’s tracking link',
      'https://s.localhost/s/abc',
      'Endpoint can’t be the tracking link of another QR code.',
    ],
  ])('rejects %s', async (_, leadsTo, error) => {
    await signedInUser()
    expect(await create(leadsTo)).toEqual({ error })
    expect(await prisma.qrCode.count()).toBe(0)
  })

  test('rejects a destination Safe Browsing flags', async () => {
    vi.stubEnv('SAFE_BROWSING_API_KEY', 'key')
    vi.stubGlobal('fetch', async () => safeBrowsingResponse('https://evil.example/', [1]))
    await signedInUser()
    expect(await create('https://evil.example/')).toEqual({
      error: 'This destination is flagged as unsafe, so it can’t be used.',
    })
    expect(await prisma.qrCode.count()).toBe(0)
  })

  test('records a clean Safe Browsing check', async () => {
    vi.stubEnv('SAFE_BROWSING_API_KEY', 'key')
    vi.stubGlobal('fetch', async () => safeBrowsingResponse())
    await signedInUser()
    await create('https://example.com/')
    expect((await prisma.qrCode.findFirstOrThrow()).destinationCheckedAt).not.toBeNull()
  })

  test('requires a session and an account that isn’t suspended', async () => {
    expect(await create('example.com')).toEqual({ error: 'You must be signed in.' })
    await signedInUser({ suspendedAt: new Date() })
    expect((await create('example.com'))?.error).toMatch(/^This account has been suspended/)
    expect(await prisma.qrCode.count()).toBe(0)
  })

  test('allows 10 codes per 24 hours, also under parallel requests', async () => {
    const user = await signedInUser()
    const results = await Promise.all(Array.from({ length: 25 }, (_, i) => create(`example.com/${i}`)))

    expect(results.filter((result) => result?.success)).toHaveLength(10)
    expect(await prisma.qrCode.count({ where: { userId: user.id } })).toBe(10)
    for (const result of results.filter((result) => !result?.success)) {
      expect(result?.error).toMatch(/^You can create up to 10 QR codes per 24 hours/)
    }
  })

  test('stores a direct code without a short link', async () => {
    const user = await signedInUser()
    expect(await create('example.com/menu', { kind: 'DIRECT' })).toEqual({ success: true })

    expect(await prisma.qrCode.findFirstOrThrow({ where: { userId: user.id } })).toMatchObject({
      kind: 'DIRECT',
      urlHash: null,
      leadsTo: 'https://example.com/menu',
    })
  })

  test('checks a direct code’s destination like a dynamic one', async () => {
    vi.stubEnv('SAFE_BROWSING_API_KEY', 'key')
    vi.stubGlobal('fetch', async () => safeBrowsingResponse('https://evil.example/', [1]))
    await signedInUser()

    expect(await create('https://bit.ly/abc', { kind: 'DIRECT' })).toEqual({
      error: 'Links through URL shorteners aren’t allowed. Use the final address.',
    })
    expect(await create('https://evil.example/', { kind: 'DIRECT' })).toEqual({
      error: 'This destination is flagged as unsafe, so it can’t be used.',
    })
    expect(await prisma.qrCode.count()).toBe(0)
  })

  test('counts direct codes toward the daily limit', async () => {
    const user = await signedInUser()
    for (let i = 0; i < 10; i++) await createDirectQrCode(user.id)
    expect((await create('example.com'))?.error).toMatch(/^You can create up to 10 QR codes per 24 hours/)
  })

  test('counts only the last 24 hours toward the daily limit', async () => {
    const user = await signedInUser()
    for (let i = 0; i < 10; i++) {
      await createQrCode(user.id, { createdAt: new Date(Date.now() - 25 * 60 * 60_000) })
    }
    expect(await create('example.com')).toEqual({ success: true })
  })
})

describe('editing a QR code', () => {
  test('keeps the hash and serves the new destination right away', async () => {
    const user = await signedInUser()
    const code = await createQrCode(user.id, { leadsTo: 'https://old.example/' })
    setCachedRedirect(code.urlHash, { leadsTo: 'https://old.example/', disabled: false }, redirectCacheGeneration())

    const result = await updateQrCodeAction(undefined, form({ id: code.id, leadsTo: 'new.example', note: 'Poster' }))
    expect(result).toEqual({ success: true })

    const stored = await prisma.qrCode.findUniqueOrThrow({ where: { id: code.id } })
    expect(stored).toMatchObject({ urlHash: code.urlHash, leadsTo: 'https://new.example', note: 'Poster' })
    expect(getCachedRedirect(code.urlHash)).toBeUndefined()
  })

  test('enables a code disabled as unsafe once its destination checks clean', async () => {
    vi.stubEnv('SAFE_BROWSING_API_KEY', 'key')
    vi.stubGlobal('fetch', async () => safeBrowsingResponse())
    const user = await signedInUser()
    const code = await createQrCode(user.id, { leadsTo: 'https://example.com/', disabledAt: new Date() })
    await prisma.qrCode.update({ where: { id: code.id }, data: { disabledReason: 'UNSAFE_DESTINATION' } })

    await updateQrCodeAction(undefined, form({ id: code.id, leadsTo: 'https://example.com/', note: 'Flyer' }))
    expect(await prisma.qrCode.findUniqueOrThrow({ where: { id: code.id } })).toMatchObject({
      disabledAt: null,
      disabledReason: null,
    })
  })

  test('keeps a manual disable', async () => {
    const user = await signedInUser()
    const code = await createQrCode(user.id, { disabledAt: new Date() })
    await prisma.qrCode.update({ where: { id: code.id }, data: { disabledReason: 'MANUAL' } })

    await updateQrCodeAction(undefined, form({ id: code.id, leadsTo: 'https://example.org/', note: 'Flyer' }))
    expect((await prisma.qrCode.findUniqueOrThrow({ where: { id: code.id } })).disabledReason).toBe('MANUAL')
  })

  test('changes a direct code’s note and design but not its destination', async () => {
    const user = await signedInUser()
    const code = await createDirectQrCode(user.id, { leadsTo: 'https://example.com/' })

    expect(
      await updateQrCodeAction(undefined, form({ id: code.id, leadsTo: 'https://example.org/', note: 'Poster' })),
    ).toEqual({
      error:
        'The endpoint of a direct QR code is part of its image, so it can’t be changed. Create a new QR code instead.',
    })

    const result = await updateQrCodeAction(
      undefined,
      form({ id: code.id, leadsTo: 'https://example.com/', note: 'Poster', shape: 'DOTS', kind: 'DYNAMIC' }),
    )
    expect(result).toEqual({ success: true })
    expect(await prisma.qrCode.findUniqueOrThrow({ where: { id: code.id } })).toMatchObject({
      kind: 'DIRECT',
      urlHash: null,
      leadsTo: 'https://example.com/',
      note: 'Poster',
      shape: 'DOTS',
    })
  })

  test('edits a direct code whose destination later rules would reject', async () => {
    const user = await signedInUser()
    const code = await createDirectQrCode(user.id, { leadsTo: 'https://bit.ly/abc' })

    const result = await updateQrCodeAction(
      undefined,
      form({ id: code.id, leadsTo: 'https://bit.ly/abc', note: 'Old' }),
    )
    expect(result).toEqual({ success: true })
  })

  test('can’t touch another user’s code', async () => {
    const owner = await createUser()
    const code = await createQrCode(owner.id, { leadsTo: 'https://example.com/' })
    await signedInUser()

    const result = await updateQrCodeAction(
      undefined,
      form({ id: code.id, leadsTo: 'https://evil.example/', note: '' }),
    )
    expect(result).toEqual({ error: 'QR code not found.' })
    await deleteQrCodeAction(code.id)
    expect((await prisma.qrCode.findUniqueOrThrow({ where: { id: code.id } })).leadsTo).toBe('https://example.com/')
  })
})

describe('deleting a QR code', () => {
  test('removes the owner’s code and its cached redirect', async () => {
    const user = await signedInUser()
    const code = await createQrCode(user.id)
    setCachedRedirect(code.urlHash, { leadsTo: code.leadsTo, disabled: false }, redirectCacheGeneration())

    await deleteQrCodeAction(code.id)
    expect(await prisma.qrCode.count()).toBe(0)
    expect(getCachedRedirect(code.urlHash)).toBeUndefined()
  })

  test('removes a direct code', async () => {
    const user = await signedInUser()
    const code = await createDirectQrCode(user.id)
    await deleteQrCodeAction(code.id)
    expect(await prisma.qrCode.count()).toBe(0)
  })

  test('ignores invalid and unknown ids, and refuses without a session', async () => {
    await signedInUser()
    await deleteQrCodeAction(42)
    await deleteQrCodeAction('missing')

    const { clearCookies } = await import('./helpers/request')
    clearCookies()
    await expect(deleteQrCodeAction('missing')).rejects.toThrow('Unauthorized')
  })
})

describe('QR code kinds', () => {
  test('give dynamic codes a short link and direct codes none', async () => {
    const user = await createUser()
    const base = { userId: user.id, leadsTo: 'https://example.com/', note: '' }

    await expect(prisma.qrCode.create({ data: { ...base, urlHash: null } })).rejects.toThrow(
      /QrCode_urlHash_matches_kind/,
    )
    await expect(
      prisma.qrCode.create({ data: { ...base, kind: 'DIRECT', urlHash: 'direct'.padEnd(32, '0') } }),
    ).rejects.toThrow(/QrCode_urlHash_matches_kind/)
    expect((await prisma.qrCode.create({ data: { ...base, urlHash: 'dynamic'.padEnd(32, '0') } })).kind).toBe('DYNAMIC')
  })
})
