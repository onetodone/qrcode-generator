type Task = () => unknown

const queue: Task[] = []

/** `after()` of `next/server`: keeps the task until `flushAfter` runs it, as the end of a response would. */
export function after(task: Task | Promise<unknown>): void {
  queue.push(typeof task === 'function' ? task : () => task)
}

/** Runs every task queued by `after()`, including tasks they queue in turn. */
export async function flushAfter(): Promise<void> {
  while (queue.length > 0) {
    const task = queue.shift()
    await task?.()
  }
}

/** Drops queued tasks without running them. */
export function clearAfter(): void {
  queue.length = 0
}
