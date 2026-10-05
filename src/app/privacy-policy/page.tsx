import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { getLegalInfo } from '@/lib/legal'
import { enabledOAuthProviders } from '@/lib/oauth-providers'
import { EmailLink, LegalPage, UNNAMED_OPERATOR } from '@/components/legal-page'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What personal data QR Code OneToDone processes, why, who receives it, and your rights.',
}

export default async function PrivacyPolicyPage() {
  await connection()
  const { operatorName, supportEmail, analytics, safeBrowsing, vercel } = getLegalInfo()
  const support = <EmailLink email={supportEmail} />
  const signInProviders = enabledOAuthProviders().map((provider) => provider.name)
  const providerList = new Intl.ListFormat('en', { type: 'disjunction' }).format(signInProviders)

  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy explains what personal data QR Code OneToDone (the “Service”) processes, why, who receives it, and
        what rights you have. It covers people with an account and people who scan a QR code created with the Service.
        Terms we use here are explained in the <Link href="/terms-of-use">Terms of Use</Link>.
      </p>

      <h2>Who is responsible</h2>
      <p>
        The Service is operated by {operatorName ?? UNNAMED_OPERATOR} (“we”, “us”), who is responsible for your personal
        data (the “controller”). You can reach us at {support}.
      </p>

      <h2>What we process</h2>

      <h3>Your account</h3>
      <ul>
        <li>Your name and email address, and a new address while you confirm a change of email.</li>
        <li>Your password, stored only as a bcrypt hash. We can’t read your password.</li>
        {signInProviders.length > 0 && (
          <li>
            If you sign in with {providerList}: the identifier of your account there, linked to your account here, and
            the name and verified email address it shares with us. We don’t keep the provider’s access tokens or your
            profile picture.
          </li>
        )}
        <li>
          When your account was created, when you confirmed your email address, when you last changed your password,
          when you agreed to the Terms of Use, and when your account was suspended, if it was.
        </li>
        <li>
          Single-use links we email you to confirm an address or reset your password. They stop working after 24 hours
          (confirmation) or 20 minutes (password reset), and are deleted once used.
        </li>
      </ul>

      <h3>Your QR codes</h3>
      <p>
        For each code: its destination, note, shape and colors, short link, number of scans, when its destination was
        set and last checked, and whether and why it is disabled.
      </p>

      <h3>People who scan a QR code</h3>
      <p>When someone scans a code or opens its short link, we:</p>
      <ul>
        <li>receive their IP address and the details of the request, as every website does;</li>
        <li>use the IP address to limit how many requests one address can make per minute, in memory only;</li>
        <li>check the browser’s user agent to leave bots and link previews out of the count, without storing it;</li>
        <li>add one to the code’s total number of scans.</li>
      </ul>
      <p>
        We set no cookies on short links and don’t record who scanned a code; the code’s owner sees only the total
        number. The destination is run by the code’s owner or someone else, and its own privacy practices apply there.
      </p>

      <h3>Server logs</h3>
      <p>
        For every request to the Service we log the time, method, address of the page, IP address, response status,
        duration, and your user ID if you are signed in. When an email can’t be delivered, we log the recipient’s
        address. Passwords, tokens and other secrets are masked before anything is logged. We use logs to keep the
        Service secure, investigate abuse and fix errors.
      </p>

      <h3>Emails</h3>
      <p>
        We send only the emails your account needs: confirming your email address, resetting your password, notices
        about changes to your email address, and a notice when someone tries to register with your address. We don’t
        send newsletters or marketing.
      </p>

      <h3>Cookies</h3>
      <p>Necessary cookies, which the Service can’t work without:</p>
      <ul>
        <li>
          Sign-in cookies (<code>authjs.session-token</code>, <code>authjs.csrf-token</code>,{' '}
          <code>authjs.callback-url</code>, possibly with a <code>__Secure-</code> or <code>__Host-</code> prefix): keep
          you signed in for up to 30 days after your last visit and protect sign-in requests.
        </li>
        <li>
          <code>reset-token</code>, <code>pending-email</code>, <code>confirm-token</code>: carry a password reset or
          confirmation link, or the address you registered with, to the page that needs it, so they never appear in page
          addresses. Each lasts one hour.
        </li>
        {analytics && (
          <li>
            <code>analytics-consent</code>: remembers your choice about analytics cookies for 180 days.
          </li>
        )}
      </ul>
      {analytics ? (
        <p>
          Analytics cookies, only if you accept them: <code>_ga</code> and <code>_ga_…</code>, set by Google Analytics
          for up to two years, unless you withdraw your consent.
        </p>
      ) : (
        <p>We don’t use analytics or advertising cookies.</p>
      )}

      {analytics && (
        <>
          <h3>Google Analytics</h3>
          <p>
            Only if you accept analytics cookies, we use Google Analytics 4, provided by Google Ireland Limited in the
            EEA, the UK and Switzerland and by Google LLC elsewhere, to understand how the site is used: pages visited,
            approximate location, device and browser, and the site you came from. When you are signed in, we also send
            our internal ID of your account, never your name or email address, so that visits from your different
            devices are counted together. Google states that Google Analytics 4 doesn’t log or store IP addresses. You
            can withdraw your consent at any time with “Cookie settings” at the bottom of every page. See{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
              Google’s Privacy Policy
            </a>
            .
          </p>
        </>
      )}

      {safeBrowsing && (
        <>
          <h3>Google Safe Browsing</h3>
          <p>
            To protect people who scan QR codes, we check web destinations with Google Safe Browsing when a code is
            saved and again after scans. We send Google the destination address only, not who created the code or who
            scanned it. See{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
              Google’s Privacy Policy
            </a>
            .
          </p>
        </>
      )}

      <h2>Why we process it</h2>
      <ul>
        <li>
          To provide the Service you signed up for: your account, QR codes, scan counts and account emails (performance
          of a contract).
        </li>
        <li>
          To keep the Service and the people who scan codes safe: server logs, rate limits,
          {safeBrowsing && ' destination checks,'} handling abuse reports, and keeping records about codes and accounts
          disabled for abuse (our legitimate interests in security and in preventing abuse).
        </li>
        {analytics && (
          <li>To understand how the site is used, only with your consent, which you can withdraw at any time.</li>
        )}
        <li>To comply with legal obligations, such as answering lawful requests from authorities.</li>
      </ul>

      <h2>Who receives it</h2>
      <p>
        We don’t sell your data or use it for advertising. We share it only with providers that run parts of the Service
        for us and process the data on our behalf:
      </p>
      <ul>
        <li>
          {vercel ? 'Vercel Inc. (United States), our hosting provider' : 'our hosting provider'}, which runs the
          Service and keeps its server logs;
        </li>
        <li>our database provider, which stores account and QR code data;</li>
        <li>our email provider, which delivers account emails;</li>
        {(analytics || safeBrowsing) && <li>Google, as described above.</li>}
        {signInProviders.length > 0 && (
          <li>
            the sign-in provider you choose ({providerList}), which confirms who you are under its own privacy policy;
          </li>
        )}
      </ul>
      <p>
        We may also disclose data where the law requires it, to answer valid legal requests, or to protect the rights,
        safety and property of our users, the public or the Service, for example when handling an abuse report. If the
        Service passes to a new operator, your data passes with it and this policy continues to apply.
      </p>

      <h2>Transfers outside your country</h2>
      <p>
        Our providers may process data in countries other than yours, including the United States. Where the law
        requires it, these transfers rely on safeguards such as the European Commission’s Standard Contractual Clauses
        or the EU–US Data Privacy Framework.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Account data and QR codes, with their scan counts: until you delete them or your account.</li>
        <li>Server logs: kept by our hosting provider for a limited time, usually no longer than 30 days.</li>
        <li>Confirmation and reset links: deleted when used or when your account is deleted.</li>
        {analytics && <li>Analytics data: up to 14 months in Google Analytics.</li>}
        <li>
          Records about codes and accounts disabled for abuse, and emails about abuse reports or your requests: as long
          as needed to handle them and to prevent repeated abuse.
        </li>
      </ul>

      <h2>Your rights</h2>
      <p>Depending on where you live, for example under the GDPR, you have the right to:</p>
      <ul>
        <li>get a copy of the personal data we hold about you, also in a portable format;</li>
        <li>have it corrected; you can change your name and email address in your profile;</li>
        <li>
          have it deleted; deleting your account in your profile removes your account, QR codes and scan counts at once;
        </li>
        <li>object to processing based on our legitimate interests, or ask us to restrict it;</li>
        {analytics && <li>withdraw your consent to analytics at any time with “Cookie settings”;</li>}
        <li>complain to a data protection authority, for example in the country where you live or work.</li>
      </ul>
      <p>To use these rights, write to {support} from the email address of your account. We answer within one month.</p>

      <h2>Security</h2>
      <p>
        Passwords are stored only as bcrypt hashes, sign-in and other sensitive actions are rate-limited, and secrets
        are masked in logs.{vercel && ' All connections to the Service are encrypted (HTTPS).'} No system is perfectly
        secure; if you notice a security problem, tell us at {support}.
      </p>

      <h2>Children</h2>
      <p>
        The Service is not for anyone under 16, and we don’t knowingly collect personal data from them. If you believe a
        child has created an account, tell us and we will delete it.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may change this policy. The date at the top shows when it last changed, and we will tell you about
        significant changes by email or on the site.
      </p>

      <h2>Contact</h2>
      <p>Questions about this policy or your data: {support}.</p>
    </LegalPage>
  )
}
