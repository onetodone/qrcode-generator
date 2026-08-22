import nodemailer from 'nodemailer'
import { getSmtpConfig } from './config'

let transporter: ReturnType<typeof nodemailer.createTransport> | undefined

// Lazy on purpose: building this eagerly at module load would validate
// SMTP_HOST/SMTP_PORT as a side effect of merely importing this module —
// which Next.js does while collecting route config at build time, with no
// real SMTP env vars available (e.g. in CI). Deferring construction to the
// first actual send means build/import never depends on SMTP being configured.
export function getTransporter() {
  transporter ??= nodemailer.createTransport(getSmtpConfig())
  return transporter
}
