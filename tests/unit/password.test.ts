import { describe, expect, test } from 'vitest'
import { hashPassword, verifyPassword, verifyPasswordConstantTime } from '@/lib/password'

describe('password hashing', () => {
  test('verifies the password a hash was made from, and only that one', async () => {
    const hash = await hashPassword('correct horse')
    expect(hash).toMatch(/^\$2[aby]\$10\$/)
    expect(await verifyPassword('correct horse', hash)).toBe(true)
    expect(await verifyPassword('wrong horse', hash)).toBe(false)
  })

  test('salts every hash', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'))
  })
})

describe('verifyPasswordConstantTime', () => {
  test('matches like verifyPassword when there is a hash', async () => {
    const hash = await hashPassword('correct horse')
    expect(await verifyPasswordConstantTime('correct horse', hash)).toBe(true)
    expect(await verifyPasswordConstantTime('wrong horse', hash)).toBe(false)
  })

  test('is false without a hash, whatever the password', async () => {
    expect(await verifyPasswordConstantTime('anything', null)).toBe(false)
    expect(await verifyPasswordConstantTime('anything', undefined)).toBe(false)
    expect(await verifyPasswordConstantTime('', '')).toBe(false)
  })
})
