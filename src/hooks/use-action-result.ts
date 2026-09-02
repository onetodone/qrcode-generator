import { useEffect, useRef } from 'react'
import type { FormState } from '@/lib/forms'

type Handlers = { onSuccess?: () => void; onError?: (message: string) => void }

/**
 * Fires `onSuccess` / `onError` once each time a `useActionState` result
 * settles into a new value. The effect re-runs on every render (handlers are a
 * fresh object each time) but is a no-op unless `state` itself changed.
 */
export function useActionResult(state: FormState, handlers: Handlers): void {
  const settledRef = useRef<FormState>(undefined)

  useEffect(() => {
    if (!state || state === settledRef.current) return
    settledRef.current = state
    if (state.success) handlers.onSuccess?.()
    else if (state.error) handlers.onError?.(state.error)
  }, [state, handlers])
}
