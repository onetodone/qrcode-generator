import { beforeEach, vi } from 'vitest'

// The logger keeps the console methods it finds when loaded, so they are
// silenced before a test file imports it.
const consoleSpies = (['log', 'warn', 'error'] as const).map((method) =>
  vi.spyOn(console, method).mockImplementation(() => {}),
)

beforeEach(() => {
  consoleSpies.forEach((spy) => spy.mockClear())
})
