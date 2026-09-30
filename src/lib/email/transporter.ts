import nodemailer from 'nodemailer'
import { getSmtpConfig } from './config'

let transporter: ReturnType<typeof nodemailer.createTransport> | undefined

/** Shared Nodemailer transport, created on first use. */
export function getTransporter() {
  transporter ??= nodemailer.createTransport(getSmtpConfig())
  return transporter
}
