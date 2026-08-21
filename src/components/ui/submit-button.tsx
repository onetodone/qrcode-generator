'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'

function SubmitButton({
  pendingLabel,
  children,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={disabled || pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  )
}

export { SubmitButton }
