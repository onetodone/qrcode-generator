'use client'

import { useActionState } from 'react'
import { toast } from 'sonner'
import { sendSetPasswordLinkAction } from '@/actions/profile'
import type { FormState } from '@/lib/forms'
import { useActionResult } from '@/hooks/use-action-result'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldError } from '@/components/ui/field'

export function SetPasswordCard({ email }: { email: string }) {
  const [state, action, pending] = useActionState<FormState>(sendSetPasswordLinkAction, undefined)
  useActionResult(state, { onSuccess: () => toast.success(`We sent a link to ${email}.`) })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a password</CardTitle>
        <CardDescription>
          Your account signs in only through a provider. We&apos;ll email you a link to choose a password; after that,
          you&apos;ll sign in again.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-3">
          {state?.error && <FieldError>{state.error}</FieldError>}
          <Button type="submit" disabled={pending} className="self-end">
            {pending ? 'Sending...' : 'Email me a link'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
