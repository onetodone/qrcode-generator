import * as z from 'zod'
import { defineTemplate, html, safeUrl } from '@onetodone/mailer'

const httpUrl = z.url({ protocol: /^https?$/ })

function link(url: string, label: string, color: string) {
  return html`<a href="${safeUrl(url)}" style="color:${color};text-decoration:underline;">${label}</a>`
}

/**
 * Sent to an address that someone tried to register again: it already has a
 * confirmed account, so the email offers sign-in and a password reset instead.
 * The register form answers the same for every address; only the owner
 * learns that the account exists.
 */
export const accountExists = defineTemplate({
  name: 'accountExists',
  schema: z.object({
    userName: z.string().optional(),
    signInUrl: httpUrl,
    resetUrl: httpUrl,
  }),
  messages: {
    en: {
      subject: 'You already have an account',
      preheader: 'Someone tried to sign up for {companyName} with this email.',
      heading: 'You already have an account',
      intro:
        'Someone tried to create a {companyName} account with this email address. You already have one, so no new account was created and nothing was changed.',
      signIn: 'If this was you, sign in instead.',
      button: 'Sign in',
      forgotPassword: 'Forgot your password? {link}.',
      resetLink: 'Choose a new one',
      ignore: "If it wasn't you, just ignore this email. Your account is safe.",
    },
  },
  render: ({ props, ui, t, branding }) => ({
    subject: t('accountExists.subject'),
    preheader: t('accountExists.preheader'),
    body: [
      ui.heading(t('accountExists.heading')),
      ui.paragraph(props.userName ? t('common.greeting', { name: props.userName }) : t('common.greetingAnonymous')),
      ui.paragraph(t('accountExists.intro')),
      ui.paragraph(t('accountExists.signIn')),
      ui.button(t('accountExists.button'), props.signInUrl),
      ui.linkFallback(props.signInUrl),
      ui.paragraph(
        t.html('accountExists.forgotPassword', {
          link: link(props.resetUrl, t('accountExists.resetLink'), branding.theme.primary),
        }),
      ),
      ui.divider(),
      ui.note(t('accountExists.ignore')),
    ],
  }),
})
