export interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  requireTLS: boolean
  auth?: { user: string; pass: string }
  from: string
}

function buildFrom(): string {
  const email = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || ''
  const name = process.env.SMTP_FROM_NAME

  return name ? `"${name}" <${email}>` : email
}

export function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const secureMode = (process.env.SMTP_SECURE || '').toLowerCase()

  if (!host || !port) {
    throw new Error('[email] SMTP_HOST and SMTP_PORT must be set')
  }

  return {
    host,
    port,
    secure: secureMode === 'ssl',
    requireTLS: secureMode === 'tls',
    auth: user && pass ? { user, pass } : undefined,
    from: buildFrom(),
  }
}
