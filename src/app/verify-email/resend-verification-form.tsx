'use client'

import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { resendVerificationEmailAction } from '@/actions/auth'
import type { FormState } from '@/lib/forms'
import { useActionResult } from '@/hooks/use-action-result'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const COOLDOWN_SECONDS = 120

export function ResendVerificationForm({
  email,
  variant = 'button',
  className,
  children,
}: {
  email: string
  variant?: 'button' | 'inline'
  className?: string
  children?: React.ReactNode
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(resendVerificationEmailAction, undefined)

  const [secondsLeft, setSecondsLeft] = useState(COOLDOWN_SECONDS)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  useActionResult(state, {
    onSuccess: () => toast.success('Confirmation email sent.'),
    onError: (message) => toast.error(message),
  })

  const label = pending
    ? 'Sending...'
    : secondsLeft > 0
      ? `Resend confirmation email (${secondsLeft}s)`
      : 'Resend confirmation email'

  return (
    <form
      action={action}
      className={cn(variant === 'button' ? 'flex w-full' : 'text-sm text-muted-foreground', className)}
      onSubmit={() => setSecondsLeft(COOLDOWN_SECONDS)}
    >
      <input type="hidden" name="email" value={email} />
      {variant === 'inline' ? (
        <>
          {children}{' '}
          <button
            type="submit"
            disabled={pending || secondsLeft > 0}
            className="text-primary underline-offset-4 hover:underline disabled:pointer-events-none disabled:no-underline disabled:opacity-50"
          >
            {label}
          </button>
        </>
      ) : (
        <Button type="submit" disabled={pending || secondsLeft > 0} variant="outline" className="ml-auto">
          {label}
        </Button>
      )}
    </form>
  )
}
