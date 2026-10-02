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

## Unsafe destinations

With `SAFE_BROWSING_API_KEY` set, every web destination is looked up in
[Google Safe Browsing](https://developers.google.com/safe-browsing) (v5
`urls:search`):

- **On save** — a flagged destination is rejected. If the lookup fails, the
  code is saved and checked on its next scan.
- **After scans** — a scan re-checks the destination in the background once
  it is due: hourly during the first week after the destination was set, daily
  after that. A flagged code is disabled: its `/s/[hash]` link opens
  `/link-disabled` instead of the destination and scans aren't counted. Saving
  the code with a safe destination enables it again.

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

The scripts use `DATABASE_URL` from the environment, falling back to `.env`.
With Docker Compose, run them in the `migrate` service:
`docker compose run --rm migrate pnpm qr:disable <hash>`. Running app instances
may keep serving a cached redirect for up to 60 seconds.

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

## Project structure

```
prisma/               Schema, migrations, seed script, generated Prisma client
scripts/              Operator scripts (disabling QR codes)
src/app/               Routes (App Router)
src/actions/           Server Actions
src/schemas/           Zod validation schemas
src/hooks/             Shared React hooks
src/components/        React components (ui/ = shadcn primitives, qrcode/ = domain components)
src/lib/                Shared utilities (Prisma client, auth guard, endpoint parsing, logger)
```

## License

[MIT](./LICENSE) © [Anton Holubeu](https://github.com/aholu)
