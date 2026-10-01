import type { MailAddress } from '@onetodone/mailer'
import type { SmtpTransportOptions } from '@onetodone/mailer/smtp'

function readBoolean(name: string): boolean | undefined {
  const value = process.env[name]?.trim().toLowerCase()

  if (!value) return undefined
  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false

  throw new Error(`[email] ${name} must be "true", "false", "1", "0" or empty`)
}

/**
 * SMTP connection settings from the `SMTP_*` environment variables.
 * Throws when host or port is missing, or when `SMTP_SECURE` / `SMTP_REQUIRE_TLS` is not a boolean.
 */
export function getSmtpOptions(): SmtpTransportOptions {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !port) {
    throw new Error('[email] SMTP_HOST and SMTP_PORT must be set')
  }

  return {
    host,
    port,
    // Left undefined when unset so nodemailer enables implicit TLS for port 465.
    secure: readBoolean('SMTP_SECURE'),
    requireTLS: readBoolean('SMTP_REQUIRE_TLS'),
    auth: user && pass ? { user, pass } : undefined,
  }
}

/**
 * "From" identity: `SMTP_FROM_EMAIL` (or `SMTP_USER`) with the optional `SMTP_FROM_NAME`.
 * Throws when neither address variable is set.
 */
export function getSender(): MailAddress {
  const address = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER
  const name = process.env.SMTP_FROM_NAME

  if (!address) {
    throw new Error('[email] SMTP_FROM_EMAIL or SMTP_USER must be set')
  }

  return name ? { name, address } : address
}

/** Support address from `SUPPORT_EMAIL`, shown in the footer of every email. Throws when unset. */
export function getSupportEmail(): string {
  const email = process.env.SUPPORT_EMAIL

  if (!email) {
    throw new Error('[email] SUPPORT_EMAIL must be set')
  }

  return email
}

/** Public base URL from `APP_URL`, used for links and the logo in emails. Throws when unset. */
export function getAppUrl(): string {
  const url = process.env.APP_URL

  if (!url) {
    throw new Error('[email] APP_URL must be set')
  }

  return url
}
