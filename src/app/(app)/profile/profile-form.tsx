'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateProfileAction } from '@/actions/profile'
import type { FormState } from '@/lib/forms'
import { useActionResult } from '@/hooks/use-action-result'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { ResendVerificationForm } from '@/app/verify-email/resend-verification-form'

export function ProfileForm({
  defaultName,
  defaultEmail,
  emailVerified,
  pendingEmail,
}: {
  defaultName: string
  defaultEmail: string
  emailVerified: boolean
  pendingEmail: string | null
}) {
  const [name, setName] = useState(defaultName)
  const [email, setEmail] = useState(defaultEmail)
  const router = useRouter()
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfileAction, undefined)

  useActionResult(state, {
    onSuccess: () => {
      toast.success('Profile updated.')
      router.refresh()
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account details</CardTitle>
        <CardDescription>Update your name and email address.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <FieldContent>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  required
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="email" className="items-center gap-2">
                Email
                <Badge variant={emailVerified ? 'secondary' : 'destructive'}>
                  {emailVerified ? 'Confirmed' : 'Not confirmed'}
                </Badge>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </FieldContent>
            </Field>
            {state?.error && <FieldError>{state.error}</FieldError>}
            <Button type="submit" disabled={pending} className="self-end">
              {pending ? 'Saving...' : 'Save changes'}
            </Button>
          </FieldGroup>
        </form>
        {pendingEmail && (
          <ResendVerificationForm email={pendingEmail} variant="inline" className="mt-4">
            Confirmation pending for <span className="font-medium text-foreground">{pendingEmail}</span>. Check your
            inbox to finish the change — your current email keeps working until then.
          </ResendVerificationForm>
        )}
      </CardContent>
    </Card>
  )
}
