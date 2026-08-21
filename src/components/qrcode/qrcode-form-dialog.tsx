'use client'

import { useActionState, useEffect, useId, useState } from 'react'
import { toast } from 'sonner'
import type { QrCodeFormState } from '@/actions/qrcode'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'

type QrCodeFormAction = (prevState: QrCodeFormState, formData: FormData) => Promise<QrCodeFormState>

export function QrCodeFormDialog({
  triggerElement,
  triggerContent,
  title,
  description,
  submitLabel,
  pendingLabel,
  successMessage,
  action,
  defaultValues,
  hiddenId,
}: {
  triggerElement: React.ReactElement
  triggerContent: React.ReactNode
  title: string
  description: string
  submitLabel: string
  pendingLabel: string
  successMessage: string
  action: QrCodeFormAction
  defaultValues?: { leadsTo?: string; location?: string }
  hiddenId?: string
}) {
  const [open, setOpen] = useState(false)
  // Controlled locally so React's automatic "reset uncontrolled fields after
  // any form action" doesn't wipe out what the user typed on a validation
  // error (Add) or revert it to the pre-edit value (Edit). Only resynced from
  // `defaultValues` at the moment the dialog opens.
  const [leadsTo, setLeadsTo] = useState(defaultValues?.leadsTo ?? '')
  const [location, setLocation] = useState(defaultValues?.location ?? '')
  const formId = useId()
  const [state, formAction, pending] = useActionState<QrCodeFormState, FormData>(action, undefined)

  // Close the dialog as soon as the action result changes to success. Done
  // during render (comparing against the previous state) rather than in an
  // Effect, since setState calls that just react to a changed value belong
  // in the render phase, not an Effect body.
  const [prevState, setPrevState] = useState(state)
  if (state !== prevState) {
    setPrevState(state)
    if (state?.success) {
      setOpen(false)
    }
  }

  // The toast is a genuine external side effect, so it stays in an Effect.
  useEffect(() => {
    if (state?.success) {
      toast.success(successMessage)
    }
  }, [state, successMessage])

  function handleOpenChange(next: boolean) {
    if (next) {
      setLeadsTo(defaultValues?.leadsTo ?? '')
      setLocation(defaultValues?.location ?? '')
    }
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={triggerElement}>{triggerContent}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form id={formId} action={formAction}>
          <FieldGroup>
            {hiddenId && <input type="hidden" name="id" value={hiddenId} />}
            <Field>
              <FieldLabel htmlFor={`${formId}-leadsTo`}>Endpoint</FieldLabel>
              <FieldContent>
                <Input
                  id={`${formId}-leadsTo`}
                  name="leadsTo"
                  placeholder="https://example.com"
                  maxLength={150}
                  value={leadsTo}
                  onChange={(event) => setLeadsTo(event.target.value)}
                  required
                />
                <FieldDescription>URL, phone number, or email address.</FieldDescription>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${formId}-location`}>Distribution point</FieldLabel>
              <FieldContent>
                <Input
                  id={`${formId}-location`}
                  name="location"
                  placeholder="Wine Connection (Porto de Phuket)"
                  maxLength={50}
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  required
                />
              </FieldContent>
            </Field>
            {state?.error && <FieldError>{state.error}</FieldError>}
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="submit" form={formId} disabled={pending}>
            {pending ? pendingLabel : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
