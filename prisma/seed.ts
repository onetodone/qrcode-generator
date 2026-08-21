import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from './generated/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const DEFAULT_USER = {
  name: 'User',
  email: 'user@some.loc',
  password: '11111111',
}

async function main() {
  const hashedPassword = await bcrypt.hash(DEFAULT_USER.password, 10)

  const user = await prisma.user.upsert({
    where: { email: DEFAULT_USER.email },
    // Reset back to the known default credentials on every reseed, so this
    // account is reliably usable for local dev/testing.
    update: { name: DEFAULT_USER.name, password: hashedPassword },
    create: { name: DEFAULT_USER.name, email: DEFAULT_USER.email, password: hashedPassword },
  })

  console.log(`Seeded default user: ${user.email}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
