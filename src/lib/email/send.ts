import type { Attachment } from 'nodemailer/lib/mailer'
import { logger } from '@/lib/logger'
import { getSmtpConfig } from './config'
import { minifyHtml } from './minify'
import { renderEmailTemplate } from './template'
import { getTransporter } from './transporter'

export type EmailAttachment = Attachment

export interface SendEmailParams {
  to: string[]
  subject?: string
  content?: string
  attachments?: EmailAttachment[]
  toCC?: string[]
  toBCC?: string[]
  preheader?: string
  footerText?: string
}

export async function sendEmail({
  to,
  subject = 'Subject',
  content = '',
  attachments = [],
  toCC = [],
  toBCC = [],
  preheader = '',
  footerText = '',
}: SendEmailParams): Promise<void> {
  const html = minifyHtml(renderEmailTemplate({ content, preheader, footerText }))

  try {
    await getTransporter().sendMail({
      from: getSmtpConfig().from,
      to,
      cc: toCC.length ? toCC : undefined,
      bcc: toBCC.length ? toBCC : undefined,
      subject,
      html,
      attachments,
    })
  } catch (error) {
    logger.error('email.send_failed', { error, to })
    throw error
  }
}
