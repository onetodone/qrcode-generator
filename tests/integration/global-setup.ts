import { execFileSync } from 'node:child_process'
import type { TestProject } from 'vitest/node'

/**
 * Applies the migrations to the test database before the integration tests
 * run. The tests empty every table, so the database name must end in `_test`.
 */
export default function setup(project: TestProject): void {
  const databaseUrl = project.config.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is not set for the integration tests')

  const databaseName = new URL(databaseUrl).pathname.slice(1)
  if (!databaseName.endsWith('_test')) {
    throw new Error(`Integration tests empty the database; "${databaseName}" doesn't end in "_test"`)
  }

  try {
    execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
      env: { ...process.env, DATABASE_URL: databaseUrl, PRISMA_HIDE_UPDATE_MESSAGE: '1' },
      stdio: 'pipe',
    })
  } catch (error) {
    const { stdout, stderr } = error as { stdout?: Buffer; stderr?: Buffer }
    throw new Error(`prisma migrate deploy failed:\n${stdout ?? ''}${stderr ?? ''}`)
  }
}
