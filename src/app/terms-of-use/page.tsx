import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { getLegalInfo } from '@/lib/legal'
import { EmailLink, LegalPage, UNNAMED_OPERATOR } from '@/components/legal-page'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'The rules for using QR Code OneToDone: who may use it, what is not allowed, and our responsibilities.',
}

export default async function TermsOfUsePage() {
  await connection()
  const { operatorName, jurisdiction, supportEmail, abuseEmail, safeBrowsing } = getLegalInfo()
  const support = <EmailLink email={supportEmail} />
  const abuse = <EmailLink email={abuseEmail} />

  return (
    <LegalPage title="Terms of Use">
      <p>
        These Terms of Use (the “Terms”) govern your use of QR Code OneToDone (the “Service”). The Service lets you
        create QR codes that point to short links on this site, sends people who scan a code on to a destination you
        choose, and counts the scans. The Service is operated by {operatorName ?? UNNAMED_OPERATOR} (“we”, “us”).
      </p>
      <p>
        By creating an account or otherwise using the Service, you agree to these Terms. Our{' '}
        <Link href="/privacy-policy">Privacy Policy</Link> explains how we handle personal data. If you don’t agree to
        these Terms, don’t use the Service.
      </p>

      <h2>Who may use the Service</h2>
      <p>
        You must be at least 16 years old and able to enter into a binding agreement. If you use the Service for an
        organization, you confirm that you may accept these Terms on its behalf, and “you” includes that organization.
      </p>

      <h2>The Service</h2>
      <ul>
        <li>
          The Service is free. We may change, limit, suspend or end all or part of it at any time, with or without
          notice. This includes limits on how many QR codes you can create or change.
        </li>
        <li>
          Every QR code points to a short link on this site (<code>/s/…</code>), and the link works only while the
          Service runs and the code exists and isn’t disabled. If the Service ends, or a code is deleted or disabled,
          printed copies of the code stop working. Keep this in mind before you print a code or rely on it for anything
          important.
        </li>
        <li>
          Scan counts are estimates. We try to leave out bots and link previews, so a count can differ from the number
          of people who actually scanned a code.
        </li>
      </ul>

      <h2>Your account</h2>
      <ul>
        <li>Register with an email address that belongs to you and that you can read.</li>
        <li>
          Keep your password secret. You are responsible for everything done with your account. If you think someone
          else has access to it, change your password and tell us at {support}.
        </li>
        <li>
          You can delete your account at any time in your profile. This deletes your QR codes too, and their links stop
          working.
        </li>
      </ul>

      <h2>Your content</h2>
      <ul>
        <li>
          You alone are responsible for the destinations, notes and anything else you add to the Service (“your
          content”), and for what people find at the destinations of your QR codes. We don’t create, review in advance,
          endorse or control the websites and other destinations your codes lead to.
        </li>
        <li>
          You confirm that you have the right to use your content, and that your content and your use of the Service
          comply with the law and these Terms.
        </li>
        <li>
          You keep any rights you have in your content. You allow us, worldwide and free of charge, to store, process
          and display it, and to send people who scan your codes to their destinations, as far as needed to run and
          protect the Service.
        </li>
      </ul>

      <h2>What is not allowed</h2>
      <p>
        You must not use the Service, or let anyone else use it, for QR codes or links that lead to or are used for:
      </p>
      <ul>
        <li>
          phishing, or pages that collect passwords, payment details or other personal information under false
          pretenses;
        </li>
        <li>malware, viruses, or software that is unwanted, deceptive or harmful;</li>
        <li>
          scams and fraud, including fake shops, fake investment or cryptocurrency schemes, and fake prizes or
          giveaways;
        </li>
        <li>
          spam or other unsolicited messages, including through codes that open an email or a phone call (
          <code>mailto:</code>, <code>tel:</code>);
        </li>
        <li>
          hiding the real destination from the people who scan a code, from us or from security checks, for example
          through other link shorteners, chains of redirects, or pages that show different content to different
          visitors;
        </li>
        <li>impersonating any person, company or organization, or falsely claiming a connection with them;</li>
        <li>child sexual abuse material, or any content that sexually exploits or endangers children;</li>
        <li>
          content or activities that are illegal, including the sale of illegal goods or services, or that infringe
          anyone’s copyright, trademark, privacy or other rights;
        </li>
        <li>harassment, threats, hate speech, or incitement to violence or terrorism.</li>
      </ul>
      <p>You also must not:</p>
      <ul>
        <li>get around limits we set, for example by creating several accounts;</li>
        <li>create accounts or QR codes automatically or in bulk, or put an unreasonable load on the Service;</li>
        <li>
          probe or test the Service’s security, interfere with or disrupt it, or access accounts or data that aren’t
          yours.
        </li>
      </ul>

      <h2>How we enforce these Terms</h2>
      <ul>
        {safeBrowsing && (
          <li>
            We check web destinations automatically with Google Safe Browsing when you save them, and again after scans.
          </li>
        )}
        <li>
          We may look into QR codes we are told about. We have no duty to monitor content, and a destination that passes
          our checks is not thereby safe or lawful.
        </li>
        <li>
          We may, at our sole discretion and without notice, refuse a destination, disable a QR code, remove content, or
          suspend or delete an account, if we believe it breaks these Terms or the law, puts people who scan codes at
          risk, or could harm the Service, including the reputation of its domain with browsers and security services.
        </li>
        <li>
          A disabled QR code leads to a page saying that the link was disabled, instead of its destination, and its
          scans aren’t counted.
        </li>
        <li>If you think we made a mistake, write to us at {support}.</li>
        <li>
          We may report illegal content to the authorities and share information with them where the law requires or
          allows it.
        </li>
      </ul>

      <h2>Reporting abuse</h2>
      <p>
        If a QR code or link from this Service leads to phishing, malware, fraud or other harmful or illegal content, or
        infringes your rights, email {abuse} with:
      </p>
      <ul>
        <li>
          the link (it contains <code>/s/</code>) or a photo of the QR code;
        </li>
        <li>why you believe it is harmful or illegal;</li>
        <li>if it infringes your rights, who you are and which of your rights it infringes.</li>
      </ul>
      <p>We review reports as quickly as we can and may disable a code while we look into it.</p>

      <h2>No warranty</h2>
      <p>
        THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE”, WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED,
        INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE AND NON-INFRINGEMENT. WE DO NOT
        WARRANT THAT THE SERVICE WILL BE AVAILABLE, UNINTERRUPTED, SECURE OR ERROR-FREE, THAT QR CODES AND LINKS WILL
        KEEP WORKING, THAT SCAN COUNTS WILL BE ACCURATE, OR THAT YOUR DATA WILL NOT BE LOST.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        TO THE FULLEST EXTENT PERMITTED BY LAW, WE ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
        EXEMPLARY OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, BUSINESS, GOODWILL OR DATA, OR FOR THE COST
        OF PRINTING OR REPLACING MATERIALS, ARISING OUT OF OR RELATING TO THE SERVICE OR THESE TERMS, EVEN IF WE WERE
        TOLD SUCH DAMAGES WERE POSSIBLE. OUR TOTAL LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THE SERVICE OR
        THESE TERMS IS LIMITED TO 10 US DOLLARS.
      </p>
      <p>
        Nothing in these Terms limits liability that cannot be limited by law, such as liability for intent, gross
        negligence or fraud, or for death or personal injury caused by negligence.
      </p>

      <h2>Indemnity</h2>
      <p>
        To the extent permitted by law, you will defend and indemnify us against any claims, damages, losses, costs and
        expenses, including reasonable legal fees, arising from your content, your QR codes and their destinations, your
        use of the Service, or your breach of these Terms or the law.
      </p>

      <h2>Ending your use</h2>
      <p>
        You may stop using the Service and delete your account at any time. We may suspend or end your access at any
        time and for any reason, including a breach of these Terms. The parts of these Terms that by their nature should
        continue to apply, such as those about your content, warranties, liability, indemnity and governing law,
        continue to apply after your access ends.
      </p>

      <h2>Changes to these Terms</h2>
      <p>
        We may change these Terms. The date at the top shows when they last changed, and we will tell you about
        significant changes by email or on the site. If you keep using the Service after a change, you accept the
        changed Terms; if you don’t accept them, stop using the Service and delete your account.
      </p>

      {jurisdiction && (
        <>
          <h2>Governing law</h2>
          <p>
            These Terms and any dispute arising out of or relating to them or the Service are governed by the laws of{' '}
            {jurisdiction}, without regard to its conflict of law rules, and are subject to the exclusive jurisdiction
            of the courts of {jurisdiction}. If you use the Service as a consumer, this doesn’t take away the protection
            of the mandatory laws of the country where you live.
          </p>
        </>
      )}

      <h2>General</h2>
      <p>
        If any part of these Terms can’t be enforced, the rest remains in effect. If we don’t enforce a part of these
        Terms, we don’t give up the right to enforce it later. You may not transfer your rights under these Terms; we
        may transfer ours, for example to a new operator of the Service. These Terms and the Privacy Policy are the
        entire agreement between you and us about the Service.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms: {support}. Abuse reports: {abuse}.
      </p>
    </LegalPage>
  )
}
