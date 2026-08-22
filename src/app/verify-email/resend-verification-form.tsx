'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { resendVerificationEmailAction, type ResendVerificationFormState } from '@/actions/auth'
import { Button } from '@/components/ui/button'

const COOLDOWN_SECONDS = 120

export function ResendVerificationForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<ResendVerificationFormState, FormData>(
    resendVerificationEmailAction,
    undefined,
  )

  const [secondsLeft, setSecondsLeft] = useState(COOLDOWN_SECONDS)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  useEffect(() => {
    if (state?.success) {
      toast.success('Confirmation email sent.')
    }
    if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <form action={action} className="w-full" onSubmit={() => setSecondsLeft(COOLDOWN_SECONDS)}>
      <input type="hidden" name="email" value={email} />
      <Button type="submit" disabled={pending || secondsLeft > 0} variant="outline" className="w-full">
        {pending
          ? 'Sending...'
          : secondsLeft > 0
            ? `Resend confirmation email (${secondsLeft}s)`
            : 'Resend confirmation email'}
      </Button>
    </form>
  )
}
