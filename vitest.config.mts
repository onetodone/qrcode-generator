import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'vitest/config'

loadEnv({ quiet: true })

/**
 * Database for integration tests: `TEST_DATABASE_URL`, else `DATABASE_URL`
 * with `_test` appended to the database name, so they never run against the
 * development database.
 */
function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL
  if (!process.env.DATABASE_URL) throw new Error('Set TEST_DATABASE_URL or DATABASE_URL to run integration tests')
  const url = new URL(process.env.DATABASE_URL)
  url.pathname = `${url.pathname}_test`
  return url.toString()
}

const sharedEnv = {
  APP_URL: 'http://localhost:3000',
  SHORT_LINK_URL: 'http://s.localhost:3000',
  SUPPORT_EMAIL: 'support@example.com',
  ABUSE_EMAIL: '',
  SAFE_BROWSING_API_KEY: '',
  TURNSTILE_SITE_KEY: '',
  TURNSTILE_SECRET_KEY: '',
  GATAG_ID: '',
}

const resolve = {
  alias: [
    { find: /^@\/generated\/(.*)$/, replacement: path.resolve(import.meta.dirname, 'prisma/generated/$1') },
    { find: /^@\/(.*)$/, replacement: path.resolve(import.meta.dirname, 'src/$1') },
  ],
}

export default defineConfig({
  test: {
    projects: [
      {
        resolve,
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          setupFiles: ['tests/unit/setup.ts'],
          env: sharedEnv,
        },
      },
      {
        resolve,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          // One database for every file.
          fileParallelism: false,
          globalSetup: ['tests/integration/global-setup.ts'],
          setupFiles: ['tests/integration/setup.ts'],
          testTimeout: 20_000,
          hookTimeout: 60_000,
          env: {
            ...sharedEnv,
            DATABASE_URL: testDatabaseUrl(),
            AUTH_SECRET: 'integration-test-secret-integration-test-secret',
            AUTH_GOOGLE_ID: 'google-client-id',
            AUTH_GOOGLE_SECRET: 'google-client-secret',
            SMTP_HOST: 'localhost',
            SMTP_PORT: '1025',
            SMTP_FROM_EMAIL: 'noreply@example.com',
          },
          // Loaded through Vite so that its `next/headers` import gets the test double.
          server: { deps: { inline: ['next-auth'] } },
        },
      },
    ],
  },
})
