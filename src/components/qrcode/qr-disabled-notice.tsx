import { BanIcon } from 'lucide-react'
import type { QrDisabledReason } from '@/generated/enums'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const SUMMARIES: Record<QrDisabledReason, string> = {
  UNSAFE_DESTINATION: 'Google Safe Browsing flagged the destination as unsafe.',
  MANUAL: 'The operator of this service disabled it for breaking the rules.',
  ACCOUNT_SUSPENDED: 'The operator of this service suspended the account that owns it.',
}

const NEXT_STEPS: Record<QrDisabledReason, string> = {
  UNSAFE_DESTINATION: 'Save a safe endpoint to enable it again.',
  MANUAL: 'Changing the endpoint doesn’t enable it again.',
  ACCOUNT_SUSPENDED: 'Contact support to restore the account.',
}

/** "Disabled" badge for a QR code card; the reason shows on hover. */
export function QrDisabledBadge({ reason }: { reason: QrDisabledReason }) {
  return (
    <Badge variant="destructive" title={SUMMARIES[reason]}>
      Disabled
    </Badge>
  )
}

/** Tells the owner why a QR code is disabled and whether editing can enable it. */
export function QrDisabledAlert({ reason }: { reason: QrDisabledReason }) {
  return (
    <Alert variant="destructive">
      <BanIcon />
      <AlertTitle>This QR code is disabled</AlertTitle>
      <AlertDescription>
        {SUMMARIES[reason]} Scans open a warning page instead of the endpoint. {NEXT_STEPS[reason]}
      </AlertDescription>
    </Alert>
  )
}
