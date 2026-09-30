/** Nodemailer transport options plus the "From" header. */
export interface SmtpConfig {
  host: string
  port: number
  secure?: boolean
  requireTLS?: boolean
  auth?: { user: string; pass: string }
  from: string
}

function buildFrom(): string {
  const email = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || ''
  const name = process.env.SMTP_FROM_NAME

  return name ? `"${name}" <${email}>` : email
}

function readBoolean(name: string): boolean | undefined {
  const value = process.env[name]?.trim().toLowerCase()

  if (!value) return undefined
  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false

  throw new Error(`[email] ${name} must be "true", "false", "1", "0" or empty`)
}

/**
 * SMTP settings from the `SMTP_*` environment variables.
 * Throws when host or port is missing, or when `SMTP_SECURE` / `SMTP_REQUIRE_TLS` is not a boolean.
 */
export function getSmtpConfig(): SmtpConfig {
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
    from: buildFrom(),
  }
}
