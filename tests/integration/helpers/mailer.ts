/** An email the app handed to the mailer. */
export type SentEmail = { template: string; to: string; props: Record<string, unknown> }

/** Emails sent since the last `resetMailer`, oldest first. */
export const sentEmails: SentEmail[] = []

let failures = 0

/** Makes the next `count` sends throw, as an unreachable SMTP server would. */
export function failNextEmails(count = 1): void {
  failures = count
}

/** Forgets sent emails and pending failures. */
export function resetMailer(): void {
  sentEmails.length = 0
  failures = 0
}

/** Emails of one template, optionally to one address. */
export function emailsOf(template: string, to?: string): SentEmail[] {
  return sentEmails.filter((email) => email.template === template && (to === undefined || email.to === to))
}

/** Value of the `token` parameter in the link of an email. */
export function tokenFromEmail(email: SentEmail | undefined): string {
  const url = email?.props.verifyUrl ?? email?.props.resetUrl
  if (typeof url !== 'string') throw new Error('The email has no link')
  const token = new URL(url).searchParams.get('token')
  if (!token) throw new Error('The link has no token')
  return token
}

/** Stand-in for `getMailer()`: records every send instead of talking SMTP. */
export const fakeMailer = {
  async send(template: string, { to, props }: { to: string; props: Record<string, unknown> }) {
    if (failures > 0) {
      failures -= 1
      throw new Error('SMTP server unreachable')
    }
    sentEmails.push({ template, to, props })
    return { messageId: `<${sentEmails.length}@test>` }
  },
}
