import type { QrDisabledReason } from '@/generated/client'
import { getAppUrl, getMailer } from '@/lib/email'

/** The account an email is about: its address and the name for the greeting. */
export type AccountRecipient = { email: string; name: string | null }

function knownIp(ip: string): string | undefined {
  return ip === 'unknown' ? undefined : ip
}

/**
 * Tells the owner of a confirmed account that someone tried to register with
 * its address, with sign-in and password reset links. Throws when the email
 * can't be sent.
 */
export async function sendAccountExistsEmail(account: AccountRecipient): Promise<void> {
  const appUrl = getAppUrl()
  await getMailer().send('accountExists', {
    to: account.email,
    props: {
      userName: account.name ?? undefined,
      signInUrl: `${appUrl}/login`,
      resetUrl: `${appUrl}/forgot-password`,
    },
  })
}

/**
 * Tells the account's current address that a change to `newEmail` was
 * requested from `ip`. Throws when the email can't be sent.
 */
export async function sendEmailChangeRequestedNotice(
  account: AccountRecipient,
  newEmail: string,
  ip: string,
): Promise<void> {
  await getMailer().send('emailChangeRequested', {
    to: account.email,
    props: { userName: account.name ?? undefined, newEmail, requestedAt: new Date(), ip: knownIp(ip) },
  })
}

/**
 * Tells the account's previous address that the account switched to
 * `newEmail`, confirmed from `ip`. Throws when the email can't be sent.
 */
export async function sendEmailChangedNotice(previous: AccountRecipient, newEmail: string, ip: string): Promise<void> {
  await getMailer().send('emailChanged', {
    to: previous.email,
    props: { userName: previous.name ?? undefined, newEmail, changedAt: new Date(), ip: knownIp(ip) },
  })
}

/**
 * Tells the account's owner that sign-in through `providerName` was connected
 * to the account. Throws when the email can't be sent.
 */
export async function sendProviderConnectedNotice(account: AccountRecipient, providerName: string): Promise<void> {
  const appUrl = getAppUrl()
  await getMailer().send('providerConnected', {
    to: account.email,
    props: { userName: account.name ?? undefined, providerName, profileUrl: `${appUrl}/profile` },
  })
}

/**
 * A disabled code: its ID, the note the owner gave it, its short link hash and
 * where it leads. `leadsTo` is left out for a destination flagged as unsafe.
 */
export type DisabledCode = { id: string; note: string; urlHash: string; leadsTo?: string }

/**
 * Tells the owner that `codes` stopped redirecting and why, or for
 * `ACCOUNT_SUSPENDED` that the account was suspended, listing the codes the
 * suspension disabled. Throws when the email can't be sent.
 */
export async function sendCodesDisabledNotice(
  account: AccountRecipient,
  reason: QrDisabledReason,
  codes: DisabledCode[],
): Promise<void> {
  const appUrl = getAppUrl()
  const [onlyCode] = codes.length === 1 ? codes : []
  await getMailer().send('codeDisabled', {
    to: account.email,
    props: {
      userName: account.name ?? undefined,
      reason,
      codes: codes.map((code) => ({
        note: code.note,
        shortUrl: `${appUrl}/s/${code.urlHash}`,
        destination: code.leadsTo,
      })),
      editUrl: onlyCode && `${appUrl}/qrcodes/${onlyCode.id}/edit`,
      termsUrl: `${appUrl}/terms-of-use`,
    },
  })
}
