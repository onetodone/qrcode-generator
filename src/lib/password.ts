import bcrypt from 'bcryptjs'

// Work factor for password hashing — higher is slower to hash and to attack.
const BCRYPT_ROUNDS = 10

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
