import nodemailer from 'nodemailer'
import { getSmtpConfig } from './config'

export const transporter = nodemailer.createTransport(getSmtpConfig())
