import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 10

/** bcrypt hash of a plain-text password. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

/** Whether `plain` matches a hash produced by `hashPassword`. */
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
