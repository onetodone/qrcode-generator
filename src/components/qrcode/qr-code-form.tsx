'use client'

import { useActionState, useId, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { FormState } from '@/lib/forms'
import { useActionResult } from '@/hooks/use-action-result'
import { DEFAULT_BG_COLOR, DEFAULT_FG_COLOR, QR_SHAPES, QR_SHAPE_LABELS, type QrShapeValue } from '@/schemas/qrcode'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field'
import { QrImage } from '@/components/qrcode/qr-image'

type QrCodeFormAction = (prevState: FormState, formData: FormData) => Promise<FormState>

export type QrCodeFormDefaults = {
  leadsTo?: string
  note?: string
  shape?: QrShapeValue
  fgColor?: string
  bgColor?: string
}

export function QrCodeForm({
  action,
  submitLabel,
  pendingLabel,
  successMessage,
  previewValue,
  defaultValues,
  hiddenId,
}: {
  action: QrCodeFormAction
  submitLabel: string
  pendingLabel: string
  successMessage: string
  previewValue: string
  defaultValues?: QrCodeFormDefaults
  hiddenId?: string
}) {
  const formId = useId()
  const router = useRouter()

  const [leadsTo, setLeadsTo] = useState(defaultValues?.leadsTo ?? '')
  const [note, setNote] = useState(defaultValues?.note ?? '')
  const [shape, setShape] = useState<QrShapeValue>(defaultValues?.shape ?? 'SQUARE')
  const [fgColor, setFgColor] = useState(defaultValues?.fgColor ?? DEFAULT_FG_COLOR)
  const [bgColor, setBgColor] = useState(defaultValues?.bgColor ?? DEFAULT_BG_COLOR)

  const [state, formAction, pending] = useActionState<FormState, FormData>(action, undefined)

  useActionResult(state, {
    onSuccess: () => {
      toast.success(successMessage)
      router.push('/')
    },
  })

  return (
    <Card>
      <CardContent className="grid gap-6 md:grid-cols-[1fr_auto]">
        <form id={formId} action={formAction}>
          <FieldGroup>
            {hiddenId ? <input type="hidden" name="id" value={hiddenId} /> : null}

            <Field>
              <FieldLabel htmlFor={`${formId}-leadsTo`}>Endpoint</FieldLabel>
              <FieldContent>
                <Input
                  id={`${formId}-leadsTo`}
                  name="leadsTo"
                  placeholder="https://example.com"
                  maxLength={200}
                  value={leadsTo}
                  onChange={(event) => setLeadsTo(event.target.value)}
                  required
                />
                <FieldDescription>URL, phone number, or email address.</FieldDescription>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor={`${formId}-note`}>Note (optional)</FieldLabel>
              <FieldContent>
                <Input
                  id={`${formId}-note`}
                  name="note"
                  placeholder="For some restaurant"
                  maxLength={200}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </FieldContent>
            </Field>

            <FieldSet>
              <FieldLegend variant="label">Design</FieldLegend>
              <FieldDescription>Shape and colors are baked into the QR image and its downloads.</FieldDescription>

              <Field>
                <FieldTitle>Shape</FieldTitle>
                <div role="radiogroup" aria-label="Shape" className="flex flex-wrap gap-2">
                  {QR_SHAPES.map((value) => (
                    <label
                      key={value}
                      className={cn(
                        'cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors',
                        'has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50',
                        shape === value
                          ? 'border-primary bg-primary/5 font-medium text-foreground'
                          : 'border-input text-muted-foreground hover:bg-muted',
                      )}
                    >
                      <input
                        type="radio"
                        name="shape"
                        value={value}
                        checked={shape === value}
                        onChange={() => setShape(value)}
                        className="sr-only"
                      />
                      {QR_SHAPE_LABELS[value]}
                    </label>
                  ))}
                </div>
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ColorField
                  id={`${formId}-fgColor`}
                  name="fgColor"
                  label="Foreground"
                  value={fgColor}
                  onChange={setFgColor}
                />
                <ColorField
                  id={`${formId}-bgColor`}
                  name="bgColor"
                  label="Background"
                  value={bgColor}
                  onChange={setBgColor}
                />
              </div>
            </FieldSet>

            {state?.error ? <FieldError>{state.error}</FieldError> : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? pendingLabel : submitLabel}
              </Button>
              <Button type="button" variant="ghost" nativeButton={false} render={<Link href="/" />}>
                Cancel
              </Button>
            </div>
          </FieldGroup>
        </form>

        <div className="flex flex-col items-center gap-2 md:w-48">
          <span className="text-sm font-medium text-muted-foreground">Preview</span>
          <div className="rounded-lg border p-3">
            <QrImage value={previewValue} shape={shape} fgColor={fgColor} bgColor={bgColor} size={160} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ColorField({
  id,
  name,
  label,
  value,
  onChange,
}: {
  id: string
  name: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldContent>
        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label={`${label} color picker`}
            value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
            onChange={(event) => onChange(event.target.value)}
            className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
          />
          <Input
            id={id}
            name={name}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            maxLength={7}
            spellCheck={false}
            className="font-mono"
          />
        </div>
      </FieldContent>
    </Field>
  )
}
