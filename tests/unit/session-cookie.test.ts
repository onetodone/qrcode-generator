import { describe, expect, test } from 'vitest'
import { readSessionCookie } from '@/lib/session-cookie'

const PLAIN = 'authjs.session-token'
const SECURE = '__Secure-authjs.session-token'

describe('readSessionCookie', () => {
  test('is none without a header or a session cookie', () => {
    expect(readSessionCookie(null)).toBe('none')
    expect(readSessionCookie('')).toBe('none')
    expect(readSessionCookie('theme=dark; other=1')).toBe('none')
  })

  test('reads a single plain or secure cookie', () => {
    expect(readSessionCookie(`${PLAIN}=abc.def`)).toEqual({ name: PLAIN, value: 'abc.def' })
    expect(readSessionCookie(`theme=dark; ${SECURE}=abc.def`)).toEqual({ name: SECURE, value: 'abc.def' })
  })

  test('trims spaces and tabs around names and values like Auth.js', () => {
    expect(readSessionCookie(`\t${PLAIN} = \tabc \t`)).toEqual({ name: PLAIN, value: 'abc' })
  })

  test('joins numbered chunks in order', () => {
    expect(readSessionCookie(`${PLAIN}.1=def; ${PLAIN}.0=abc; ${PLAIN}.2=ghi`)).toEqual({
      name: PLAIN,
      value: 'abcdefghi',
    })
  })

  test('ignores a session cookie with an empty value', () => {
    expect(readSessionCookie(`${PLAIN}=`)).toBe('none')
  })

  test.each([
    ['a prefixed name that is not a chunk', `${PLAIN}=abc; ${PLAIN}x=def`],
    ['a chunk with a leading zero', `${PLAIN}.0=abc; ${PLAIN}.01=def`],
    ['a repeated name', `${PLAIN}=abc; ${PLAIN}=def`],
    ['a repeated name with a tab prefix', `${PLAIN}=abc; \t${PLAIN}=def`],
    ['secure and plain names together', `${SECURE}=abc; ${PLAIN}=def`],
    ['a chunk gap', `${PLAIN}.0=abc; ${PLAIN}.2=def`],
    ['chunks not starting at zero', `${PLAIN}.1=abc`],
    ['a chunk next to a plain cookie', `${PLAIN}=abc; ${PLAIN}.0=def`],
    ['a value outside base64url and dots', `${PLAIN}=abc%20def`],
    ['a quoted value', `${PLAIN}="abc"`],
  ])('is invalid with %s', (_, header) => {
    expect(readSessionCookie(header)).toBe('invalid')
  })
})
