import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 10

/** bcrypt hash of a plain-text password. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

// Hash of a random string nobody knows, at the same cost as `hashPassword`.
const DUMMY_HASH = '$2b$10$L0f39axSRrL6CnLL6LVZtO8BVwwzwXIZd0jSO0MlGzHc/hRFvtFyu'

/** Whether `plain` matches a hash produced by `hashPassword`. */
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

/**
 * `verifyPassword` that also takes as long when there is no hash to check
 * (unknown account), so response time doesn't reveal which accounts exist.
 * Always false without a hash.
 */
export async function verifyPasswordConstantTime(plain: string, hash: string | null | undefined): Promise<boolean> {
  const matches = await bcrypt.compare(plain, hash ?? DUMMY_HASH)
  return Boolean(hash) && matches
}
