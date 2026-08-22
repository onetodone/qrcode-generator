import nodemailer from 'nodemailer'
import { getSmtpConfig } from './config'

let transporter: ReturnType<typeof nodemailer.createTransport> | undefined

export function getTransporter() {
  transporter ??= nodemailer.createTransport(getSmtpConfig())
  return transporter
}
