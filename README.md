# QR Code Generator

A self-hosted QR code generator with scan tracking. Create a QR code, hand out
the short redirect link it produces, and see how many times it's been
scanned — per code. Give each one an optional note so you remember where it's
deployed.

## Features

- **QR code generation** — client-side rendering (no server-side file
  storage), downloadable as SVG or high-resolution PNG.
- **Styled codes** — pick a module shape (square, rounded, dots) and
  foreground/background colours; the style is baked into the image and its
  downloads.
- **Scan tracking** — every code gets a short `/s/[hash]` redirect link;
  each human hit increments a view counter atomically (bot and preview-crawler
  hits are filtered out).
- **Smart endpoint detection** — paste a URL, phone number, or email address
  as the destination and it's validated and normalized accordingly.
- **Multi-user** — each account manages its own set of QR codes; email +
  password authentication with email confirmation and password reset. The
  password is chosen when the email address is confirmed, and an email change
  needs the current password and is announced to the old address.
- **Sign-in providers** — optional sign-up and sign-in with Google, GitHub,
  Microsoft, Facebook, Discord, GitLab or LinkedIn; each one turns on when its
  credentials are set. See [Sign-in providers](#sign-in-providers).
- **Editable metadata** — update a code's destination, note, or design after
  creation without regenerating the QR image itself.
- **Unsafe destination protection** — destinations are checked against
  Google Safe Browsing when saved and re-checked after scans; flagged codes
  stop redirecting and show a warning page. Destinations behind URL shorteners
  or on bare IP addresses are rejected. Each account can create up to 10 codes
  per 24 hours.
- **Legal pages and privacy** — Terms of Use and Privacy Policy pages filled
  in from the environment; registration requires agreeing to the terms; Google
  Analytics loads only after a visitor accepts it in a cookie banner; users can
  delete their account, with all its codes, from the profile.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Prisma ORM v7](https://www.prisma.io) + PostgreSQL
- [Auth.js (NextAuth) v5](https://authjs.dev) — credentials-based auth, JWT sessions
- [Zod](https://zod.dev) for validation
- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) for the QR matrix, rendered to a custom SVG
- [@onetodone/mailer](https://github.com/onetodone/mailer) for transactional email, sent over SMTP with [Nodemailer](https://nodemailer.com)

## Getting started

### Prerequisites

- Node.js 26+
- [pnpm](https://pnpm.io) (version is pinned via `packageManager`; run
  `corepack enable` to have the right version picked up automatically)
- A PostgreSQL database (local or hosted)

### Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the environment template and fill in your own values:

   ```bash
   cp .env.example .env
   ```

   | Variable                                                            | Description                                                              |
   | ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
   | `PORT`                                                              | Port the dev/start server listens on.                                 |
   | `DATABASE_URL`                                                      | PostgreSQL connection string.                                         |
   | `APP_URL`                                                           | Public base URL — used for metadata and links in outgoing email.      |
   | `AUTH_SECRET`                                                       | Auth.js session secret. Generate with `openssl rand -base64 32`.      |
   | `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS`               | Outgoing mail server (email confirmation, password reset).            |
   | `SMTP_SECURE` / `SMTP_REQUIRE_TLS`                                  | Encryption, `true`/`1`, `false`/`0` or empty. `SMTP_SECURE=true` connects over TLS from the start (default on port 465); `SMTP_REQUIRE_TLS=true` requires a STARTTLS upgrade. Use port 465, or 587 with `SMTP_REQUIRE_TLS=true`. |
   | `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME`                                | "From" identity on outgoing email (defaults to `SMTP_USER`).          |
   | `SUPPORT_EMAIL`                                                     | Support address shown in the footer of every outgoing email and on the legal pages. Required. |
   | `ABUSE_EMAIL`                                                       | Address for abuse reports on the Terms of Use page (optional, defaults to `SUPPORT_EMAIL`). |
   | `LEGAL_OPERATOR_NAME` / `LEGAL_JURISDICTION`                        | Operator named on the legal pages, and the jurisdiction whose law governs the Terms (both optional). See [Legal pages](#legal-pages). |
   | `GATAG_ID`                                                          | Google Analytics measurement ID (optional). Loads only after a visitor accepts analytics cookies; its origins must be added to `CSP_CONNECT_SRC_EXTRA`. |
   | `SAFE_BROWSING_API_KEY`                                             | Google Safe Browsing API key (optional). Empty turns destination checks off. See [Unsafe destinations](#unsafe-destinations). |
   | `AUTH_<PROVIDER>_ID` / `AUTH_<PROVIDER>_SECRET`                     | OAuth client of a sign-in provider (optional). See [Sign-in providers](#sign-in-providers). |

3. Apply database migrations:

   ```bash
   pnpm exec prisma migrate dev
   ```

4. (Optional) Seed a default user for local development:

   ```bash
   pnpm exec prisma db seed
   ```

   This creates `user@some.loc` / `11111111`.

5. Start the dev server:

   ```bash
   pnpm dev
   ```

### Run with Docker

Requires only Docker — no local Node/pnpm/Postgres setup. Spins up the app
(a slim standalone build), a Postgres database, and applies migrations
automatically:

```bash
cp .env.example .env
# fill in AUTH_SECRET, SUPPORT_EMAIL and the SMTP_* settings in .env
# (DATABASE_URL there is ignored — Compose points the app at its own bundled
# Postgres instead)
docker compose up --build
```

The app is then available at `http://localhost:3000` (override with `PORT`
in `.env`). Data persists in a named Docker volume across restarts.

Sign-in requires a confirmed email address, so Compose refuses to start without
`SMTP_HOST`, `SMTP_PORT` and `SUPPORT_EMAIL`. The SMTP settings must point at a
mail server reachable from the container (`localhost` inside the container is
the container itself). Set `APP_URL` to the address users open the app at —
links in outgoing email are built from it.

Logs and rate limits key on the client IP. The server takes it from
`X-Forwarded-For` only when the request comes from a trusted peer, a reverse
proxy that appends the client address (nginx with
`$proxy_add_x_forwarded_for`, Caddy, Traefik). Any other request gets its
socket address, so a client can't pick its own IP by sending the header.
`TRUSTED_PROXY` sets which peers are trusted: `private` (default) for loopback
and private networks, `all` for a proxy on a public address such as a CDN in
front of the origin, `none` for no proxy. Vercel sets the header itself and
ignores the variable.

## Sign-in providers

Besides email and password, users can sign up and sign in through third-party
providers. A provider is offered only when both of its variables are set; with
none set, sign-in is email and password only.

| Provider  | Variables                                                     | Register the app at                                         |
| --------- | ------------------------------------------------------------- | ----------------------------------------------------------- |
| Google    | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`                        | Google Cloud Console → APIs & Services → Credentials        |
| GitHub    | `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`                        | GitHub → Settings → Developer settings → OAuth Apps         |
| Microsoft | `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET` | Microsoft Entra admin center → App registrations            |
| Facebook  | `AUTH_FACEBOOK_ID`, `AUTH_FACEBOOK_SECRET`                    | Meta for Developers → My Apps                               |
| Discord   | `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`                      | Discord Developer Portal → Applications → OAuth2            |
| GitLab    | `AUTH_GITLAB_ID`, `AUTH_GITLAB_SECRET`                        | GitLab → Preferences → Applications (scope `read_user`)     |
| LinkedIn  | `AUTH_LINKEDIN_ID`, `AUTH_LINKEDIN_SECRET`                    | LinkedIn Developers → My apps ("Sign In with LinkedIn using OpenID Connect") |

The callback URL to register is `<APP_URL>/api/auth/callback/<provider>`, for
example `https://example.com/api/auth/callback/google`; Microsoft's provider
id is `microsoft-entra-id`. Register the Microsoft app for personal and
work or school accounts; work accounts sign in only with the `xms_edov`
optional claim configured, which marks their email address as verified.

How it behaves:

- A provider account with an email address the provider has verified creates
  an account here on first sign-in, confirmed and with the Terms of Use
  accepted (the buttons sit above that notice). A provider that shares no
  verified address is refused. Facebook doesn't say whether an address is
  verified, so it only signs in to accounts it was connected to.
- When the address already belongs to an account, nothing is linked
  automatically: the user signs in with the password and connects the
  provider under **Profile → Connected accounts**. Email addresses are matched
  regardless of letter case. An address that was registered but never
  confirmed is released to the provider sign-in.
- Connecting a provider needs a sign-in from the last 10 minutes, checked
  against the database, and the account's address gets an email about it.
- A connected provider can be disconnected unless it is the only way left to
  sign in. An account without a password gets an emailed link to set one, and
  confirms its deletion by typing its email address, also within 10 minutes
  of signing in.
- Suspended accounts can't sign in through a provider either. Provider access
  tokens aren't stored.

To add another provider supported by Auth.js, add an entry to
`src/lib/oauth-providers.ts` (id, name, authorization origin, provider factory
and the check that tells whether the profile's email is verified), optionally
its mark in `src/components/provider-icons.tsx`, and its two variables to
`.env.example` and `docker-compose.yml`.

## Unsafe destinations

With `SAFE_BROWSING_API_KEY` set, every web destination is looked up in
[Google Safe Browsing](https://developers.google.com/safe-browsing) (v5
`urls:search`):

- **On save** — a flagged destination is rejected. If the lookup fails, the
  code is saved and checked on its next scan.
- **After scans** — a scan re-checks the destination in the background once
  it is due: hourly during the first week after the destination was set, daily
  after that. A flagged code is disabled: its `/s/[hash]` link opens
  `/link-disabled` instead of the destination and scans aren't counted, and
  the owner gets an email naming the code, the reason and a link to change the
  destination. Saving the code with a safe destination enables it again.

With or without a key, a destination is rejected on save when it carries a
username or password (`https://bank.example@evil.example`), is another code's
`/s/` link, uses an IP address instead of a domain name, or goes through a URL
shortener or redirect page (listed in `src/lib/url-shorteners.ts`), since those
hide the final address from the lookup. Stored destinations aren't re-validated
against these rules.

To get a key, create a Google Cloud project, enable the **Safe Browsing API**,
and create an API key restricted to that API. The Safe Browsing API is free for
non-commercial use only; a commercial service needs
[Web Risk](https://cloud.google.com/web-risk) instead. Destination URLs are
sent to Google as part of the lookup.

Codes reported by other means (for example an abuse email) can be disabled by
hand. A manual disable survives edits by the owner:

```bash
pnpm qr:disable https://example.com/s/<hash>          # one code (link or bare hash)
pnpm qr:disable <hash> --owner                        # every code of the same owner
pnpm qr:enable <hash>                                 # lift a manual disable
```

`qr:disable` emails the owner which codes it disabled and why. The scripts use
`DATABASE_URL`, `APP_URL`, `SUPPORT_EMAIL` and the `SMTP_*` settings from the
environment, falling back to `.env`; when the email fails, the disable stays in
place and the script exits with an error. With Docker Compose, run them in the
`migrate` service:
`docker compose run --rm migrate pnpm qr:disable <hash>`. Running app instances
may keep serving a cached redirect for up to 60 seconds.

## Account suspension

An account that breaks the Terms of Use can be suspended by email address, QR
hash or short link. Its enabled codes stop redirecting, and it can no longer
sign in, create codes or edit them, and the owner gets an email listing the
codes the suspension disabled. Unsuspending restores those codes; manual
disables remain in place:

```bash
pnpm user:suspend owner@example.com
pnpm user:suspend https://example.com/s/your-hash
pnpm user:unsuspend owner@example.com
```

Like the QR scripts, they run in the `migrate` service with Docker Compose.
The sign-in error points the owner to `SUPPORT_EMAIL`; signed-in sessions end
within 30 seconds. Running app instances may keep serving a cached redirect for
up to 60 seconds.

## Legal pages

`/terms-of-use` and `/privacy-policy` are public and linked from the footer,
the sign-in pages and the registration form, where agreeing to the terms is
required. They are rendered per request from the environment:

- `LEGAL_OPERATOR_NAME` — the person or organization running the instance,
  named as operator and data controller. Without it the pages describe the
  operator generically.
- `LEGAL_JURISDICTION` — the governing law and courts for the Terms. Without
  it that section is left out.
- `SUPPORT_EMAIL` and `ABUSE_EMAIL` — the contact and abuse-report addresses.
- The Google Analytics and Safe Browsing sections appear only when `GATAG_ID`
  and `SAFE_BROWSING_API_KEY` are set; the hosting provider is named only on
  Vercel.

The texts are a starting point, not legal advice. Review them, and adjust them
to your jurisdiction and providers, before running a public instance.

## Scripts

| Command             | Description                                        |
| -------------------- | ------------------------------------------------- |
| `pnpm dev`           | Start the dev server (Turbopack).                 |
| `pnpm build`         | Production build.                                 |
| `pnpm start`         | Start the production server.                      |
| `pnpm lint`          | Run ESLint with autofix.                          |
| `pnpm lint:ci`       | Run ESLint without autofix (as CI does).          |
| `pnpm typecheck`     | Type-check without emitting output.               |
| `pnpm format`        | Format the codebase with Prettier.                |
| `pnpm qr:disable`    | Disable a QR code by hand (see [Unsafe destinations](#unsafe-destinations)). |
| `pnpm qr:enable`     | Lift a manual disable.                            |
| `pnpm user:suspend`  | Suspend an account (see [Account suspension](#account-suspension)). |
| `pnpm user:unsuspend` | Lift a suspension. |

## Project structure

```
prisma/               Schema, migrations, seed script, generated Prisma client
scripts/              Operator scripts (QR moderation and account suspension)
src/app/               Routes (App Router)
src/actions/           Server Actions
src/schemas/           Zod validation schemas
src/hooks/             Shared React hooks
src/components/        React components (ui/ = shadcn primitives, qrcode/ = domain components)
src/lib/                Shared utilities (Prisma client, auth guard, endpoint parsing, logger)
```

## License

[MIT](./LICENSE) © [Anton Holubeu](https://github.com/aholu)
