import * as z from 'zod'
import { defineTemplate, html, safeUrl } from '@onetodone/mailer'
import { QrDisabledReason } from '@/generated/client'

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

/**
 * Sent when a sign-in provider is connected to an existing account, so the
 * owner notices a connection made by someone else with access to the session.
 */
export const providerConnected = defineTemplate({
  name: 'providerConnected',
  schema: z.object({
    userName: z.string().optional(),
    providerName: z.string(),
    profileUrl: httpUrl,
  }),
  messages: {
    en: {
      subject: '{providerName} was connected to your account',
      preheader: 'You can now sign in to {companyName} with {providerName}.',
      heading: 'A sign-in provider was connected',
      intro: '{providerName} was connected to your {companyName} account. It can now be used to sign in.',
      button: 'Review connected accounts',
      notYou:
        "If you didn't do this, disconnect it on your profile page, change your password and contact us at {supportEmail}.",
    },
  },
  render: ({ props, ui, t, branding }) => ({
    subject: t('providerConnected.subject', { providerName: props.providerName }),
    preheader: t('providerConnected.preheader', { providerName: props.providerName }),
    body: [
      ui.heading(t('providerConnected.heading')),
      ui.paragraph(props.userName ? t('common.greeting', { name: props.userName }) : t('common.greetingAnonymous')),
      ui.paragraph(t('providerConnected.intro', { providerName: props.providerName })),
      ui.button(t('providerConnected.button'), props.profileUrl),
      ui.linkFallback(props.profileUrl),
      ui.divider(),
      ui.note(t('providerConnected.notYou', { supportEmail: branding.supportEmail })),
    ],
  }),
})

/**
 * Sent when codes stop redirecting: a Safe Browsing re-check flagged the
 * destination, an operator disabled them, or the account was suspended. It
 * names the codes, the reason and what the owner can do, as the statement of
 * reasons the EU Digital Services Act expects.
 */
export const codeDisabled = defineTemplate({
  name: 'codeDisabled',
  schema: z.object({
    userName: z.string().optional(),
    reason: z.enum(QrDisabledReason),
    codes: z.array(z.object({ note: z.string(), shortUrl: httpUrl, destination: z.string().optional() })),
    editUrl: httpUrl.optional(),
    termsUrl: httpUrl,
  }),
  messages: {
    en: {
      subject: { one: 'We disabled your QR code', other: 'We disabled {count} of your QR codes' },
      subjectSuspended: 'We suspended your account',
      preheader: { one: 'It no longer opens its website.', other: 'They no longer open their websites.' },
      preheaderSuspended: 'You can no longer sign in, and your QR codes no longer open their websites.',
      introUnsafe:
        'We disabled this QR code because Google Safe Browsing reports the website it opens as dangerous (malware, phishing or unwanted software):',
      introManual: {
        one: 'We disabled this QR code because it breaks our {terms}:',
        other: 'We disabled these QR codes because they break our {terms}:',
      },
      introSuspended:
        'We suspended your {companyName} account because it breaks our {terms}. You can no longer sign in, create QR codes or edit them.',
      codesSuspended: {
        one: 'We also disabled your QR code:',
        other: 'We also disabled your {count} QR codes:',
      },
      effect: {
        one: 'People who scan it or open its short link now see a “Link disabled” page instead of the website.',
        other: 'People who scan them or open their short links now see a “Link disabled” page instead of the websites.',
      },
      noNote: 'No note',
      opens: 'Opens: {destination}',
      shortLink: 'Short link: {shortUrl}',
      actionUnsafe:
        'To turn the code back on, change where it leads to a safe website. If you think the website was reported by mistake, write to us at {supportEmail}.',
      actionManual: 'If you think we made a mistake, write to us at {supportEmail}.',
      termsLink: 'Terms of Use',
      button: 'Change where it leads',
    },
  },
  render: ({ props, ui, t, branding }) => {
    const terms = link(props.termsUrl, t('codeDisabled.termsLink'), branding.theme.primary)
    const count = props.codes.length
    const codeBlocks = props.codes.map((code) =>
      ui.paragraph(
        [
          code.note || t('codeDisabled.noNote'),
          code.destination && t('codeDisabled.opens', { destination: code.destination }),
          t('codeDisabled.shortLink', { shortUrl: code.shortUrl }),
        ]
          .filter(Boolean)
          .join('\n'),
      ),
    )
    const greeting = ui.paragraph(
      props.userName ? t('common.greeting', { name: props.userName }) : t('common.greetingAnonymous'),
    )
    const contact = ui.note(t('codeDisabled.actionManual', { supportEmail: branding.supportEmail }))

    if (props.reason === QrDisabledReason.ACCOUNT_SUSPENDED) {
      return {
        subject: t('codeDisabled.subjectSuspended'),
        preheader: t('codeDisabled.preheaderSuspended'),
        body: [
          ui.heading(t('codeDisabled.subjectSuspended')),
          greeting,
          ui.paragraph(t.html('codeDisabled.introSuspended', { terms })),
          ...(count > 0
            ? [
                ui.paragraph(t('codeDisabled.codesSuspended', { count })),
                ...codeBlocks,
                ui.paragraph(t('codeDisabled.effect', { count })),
              ]
            : []),
          ui.divider(),
          contact,
        ],
      }
    }

    const subject = t('codeDisabled.subject', { count })
    const head = [ui.heading(subject), greeting]
    const preheader = t('codeDisabled.preheader', { count })

    if (props.reason === QrDisabledReason.UNSAFE_DESTINATION) {
      return {
        subject,
        preheader,
        body: [
          ...head,
          ui.paragraph(t('codeDisabled.introUnsafe')),
          ...codeBlocks,
          ui.paragraph(t('codeDisabled.effect', { count })),
          ui.paragraph(t('codeDisabled.actionUnsafe', { supportEmail: branding.supportEmail })),
          ...(props.editUrl
            ? [ui.button(t('codeDisabled.button'), props.editUrl), ui.linkFallback(props.editUrl)]
            : []),
        ],
      }
    }

    return {
      subject,
      preheader,
      body: [
        ...head,
        ui.paragraph(t.html('codeDisabled.introManual', { count, terms })),
        ...codeBlocks,
        ui.paragraph(t('codeDisabled.effect', { count })),
        ui.divider(),
        contact,
      ],
    }
  },
})
