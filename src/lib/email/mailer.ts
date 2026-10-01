import { createMailer } from '@onetodone/mailer'
import { smtpTransport } from '@onetodone/mailer/smtp'
import { logger } from '@/lib/logger'
import { getAppUrl, getSender, getSmtpOptions, getSupportEmail } from './config'

function createAppMailer() {
  const appUrl = getAppUrl()

  return createMailer({
    transport: smtpTransport(getSmtpOptions()),
    from: getSender(),
    branding: {
      companyName: 'QR Code OneToDone',
      appUrl,
      supportEmail: getSupportEmail(),
      logoUrl: `${appUrl}/logo.png`,
      logoWidth: 48,
      logoHeight: 48,
      footerText: 'This is an automated message, please do not reply.',
      theme: { primary: '#111827', background: '#f3f4f6', text: '#111827', mutedText: '#6b7280' },
    },
    onSent: ({ template, result, durationMs }) => {
      logger.info('email.sent', { template, messageId: result.messageId, durationMs })
    },
    onError: ({ template, to, error }) => {
      logger.error('email.send_failed', { template, to, error })
    },
  })
}

let mailer: ReturnType<typeof createAppMailer> | undefined

/**
 * Shared mailer over SMTP, created on first use. Throws when the `SMTP_*`,
 * `SUPPORT_EMAIL` or `APP_URL` settings are missing or invalid.
 */
export function getMailer() {
  mailer ??= createAppMailer()
  return mailer
}
