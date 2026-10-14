import { describe, expect, test } from 'vitest'
import { maskSecrets } from '@/lib/logger'

const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'

describe('maskSecrets', () => {
  test('redacts fields with sensitive names at any depth', () => {
    expect(
      maskSecrets({
        email: 'a@example.com',
        password: 'hunter2',
        nested: { currentPassword: 'x', sessionToken: 'y', Authorization: 'z', cookie: 'c', apiSecret: 's' },
      }),
    ).toEqual({
      email: 'a@example.com',
      password: '[redacted]',
      nested: {
        currentPassword: '[redacted]',
        sessionToken: '[redacted]',
        Authorization: '[redacted]',
        cookie: '[redacted]',
        apiSecret: '[redacted]',
      },
    })
  })

  test('redacts JWTs, bearer credentials and secret query parameters inside strings', () => {
    expect(maskSecrets(`session ${JWT} end`)).toBe('session [redacted] end')
    expect(maskSecrets('Bearer abc.def-ghi')).toBe('Bearer [redacted]')
    expect(maskSecrets('/reset-password?token=abc123&x=1')).toBe('/reset-password?token=[redacted]&x=1')
    expect(maskSecrets('/callback?code=xyz#state')).toBe('/callback?code=[redacted]#state')
  })

  test('turns errors into masked plain objects', () => {
    const masked = maskSecrets(new Error(`bad token ${JWT}`)) as Record<string, unknown>
    expect(masked.name).toBe('Error')
    expect(masked.message).toBe('bad token [redacted]')
    expect(String(masked.stack)).not.toContain(JWT)
  })

  test('cuts off cycles and deep nesting', () => {
    const cyclic: Record<string, unknown> = { a: 1 }
    cyclic.self = cyclic
    expect(maskSecrets(cyclic)).toEqual({ a: 1, self: '[circular]' })
    expect(maskSecrets({ a: { b: { c: { d: { e: { f: { g: 1 } } } } } } })).toEqual({
      a: { b: { c: { d: { e: { f: '[truncated]' } } } } },
    })
  })

  test('keeps other values as they are', () => {
    expect(maskSecrets([1, null, true, 'plain'])).toEqual([1, null, true, 'plain'])
  })
})
