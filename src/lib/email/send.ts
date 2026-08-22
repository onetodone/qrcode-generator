import type { Attachment } from 'nodemailer/lib/mailer'
import { getSmtpConfig } from './config'
import { minifyHtml } from './minify'
import { renderEmailTemplate } from './template'
import { transporter } from './transporter'

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
    await transporter.sendMail({
      from: getSmtpConfig().from,
      to,
      cc: toCC.length ? toCC : undefined,
      bcc: toBCC.length ? toBCC : undefined,
      subject,
      html,
      attachments,
    })
  } catch (error) {
    console.error('[email] failed to send', error)
    throw error
  }
}
