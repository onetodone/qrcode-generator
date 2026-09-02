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
  password authentication with email confirmation and password reset.
- **Editable metadata** — update a code's destination, note, or design after
  creation without regenerating the QR image itself.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Prisma ORM v7](https://www.prisma.io) + PostgreSQL
- [Auth.js (NextAuth) v5](https://authjs.dev) — credentials-based auth, JWT sessions
- [Zod](https://zod.dev) for validation
- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) for the QR matrix, rendered to a custom SVG
- [Nodemailer](https://nodemailer.com) for transactional email

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
   | `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` | Outgoing mail server (email confirmation, password reset). `SMTP_SECURE` is `ssl`, `tls`, or empty. |
   | `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME`                                | "From" identity on outgoing email (defaults to `SMTP_USER`).          |

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
# fill in AUTH_SECRET in .env (DATABASE_URL there is ignored — Compose points
# the app at its own bundled Postgres instead)
docker compose up --build
```

The app is then available at `http://localhost:3000` (override with `PORT`
in `.env`). Data persists in a named Docker volume across restarts.

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

## Project structure

```
prisma/               Schema, migrations, seed script, generated Prisma client
src/app/               Routes (App Router)
src/actions/           Server Actions
src/schemas/           Zod validation schemas
src/hooks/             Shared React hooks
src/components/        React components (ui/ = shadcn primitives, qrcode/ = domain components)
src/lib/                Shared utilities (Prisma client, auth guard, endpoint parsing, logger)
```

## Contributing

Branching, CI, and release process are documented in
[`CONTRIBUTING.md`](./CONTRIBUTING.md).

## License

[MIT](./LICENSE) © [Anton Holubeu](https://github.com/aholu)
