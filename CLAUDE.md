# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## ⚠️ Non-standard Next.js version

This project pins `next@16.2.4`, `react@19.2.4`, and `react-dom@19.2.4` — versions ahead of this
model's training data. Per `AGENTS.md`, consult `node_modules/next/dist/docs/` for any API you're
unsure about (routing, middleware, config, data fetching) rather than assuming conventions from
older Next.js. Pay attention to deprecation notices.

## Commands

- `npm run dev` — start the dev server (localhost:3000)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`, based on `eslint-config-next`)
- `npx prisma generate` — regenerate the Prisma client after schema changes (also runs automatically via `postinstall`)
- `npx prisma migrate dev --name <name>` — create/apply a migration during development
- `npx prisma db seed` — run `prisma/seed.ts` (uses `ts-node`, configured under `prisma.seed` in `package.json`)

There is no test suite configured in this repo.

## Architecture

VitalStats is a Next.js App Router site (marketing pages + an admin backoffice) backed by
PostgreSQL via Prisma.

- **`src/app/`** — App Router pages and API routes.
  - Public marketing pages: `/`, `/products`, `/products/[slug]`, `/contact`, `/book-consult`.
    The homepage is composed from section components in `src/components/home/`.
  - `/admin/*` — backoffice UI (`inquiries`, `orders`, `products`, `login`), gated by
    `src/middleware.ts` (matches everything under `/admin/` except `/admin/login`) using
    `next-auth`'s `withAuth`.
  - `src/app/api/*` — route handlers for `products`, `orders`, `inquiries`, `medical-history`,
    `submit-form`, and NextAuth (`api/auth/[...nextauth]`). Handlers follow a consistent shape:
    parse `NextRequest`, hit Prisma, return `NextResponse.json({ data | error }, { status })`,
    with try/catch logging as `[METHOD /api/path]`.
- **`src/lib/prisma.ts`** — singleton `PrismaClient`, cached on `globalThis` to survive dev
  hot-reload. Always import `prisma` from here rather than instantiating a new client.
- **`src/lib/auth.ts`** — NextAuth config (`authOptions`): JWT sessions, Prisma adapter,
  credentials provider. **Known wart:** password hashes are stored in `User.image` (not a
  dedicated field) — see the `TODO` in `authorize()` before changing auth-related schema/logic.
- **`prisma/schema.prisma`** — single source of truth for the data model. Key domains:
  - `Product` (+ `ProductImage`, `ProductIngredient`, `ProductBenefit`) — catalog entries with
    `Category` / `DeliveryMethod` enums; images are stored in Cloudinary (`next-cloudinary`),
    with the Prisma row holding the URL/`publicId`.
  - `Inquiry` — general contact-form submissions (`InquiryType` / `InquiryStatus`).
  - `Order` / `OrderItem` — order tracking (`OrderStatus`); `OrderItem` snapshots `productName`
    at order time so renaming a product doesn't rewrite history.
  - `MedicalHistory` — the book-consult intake form, including BMI fields and yes/no medical
    questions stored as strings (not booleans) and three separate consent flags.
  - `User` / `Account` / `Session` / `VerificationToken` — NextAuth's required models, plus a
    `Role` enum (`ADMIN` / `SUPER_ADMIN`) on `User`.
- **`src/types/next-auth.d.ts`** — module augmentation adding `id`/`role` to the NextAuth
  `session.user`/`token` types; keep in sync with the callbacks in `src/lib/auth.ts`.
- Styling is Tailwind CSS v4 (`@tailwindcss/postcss`, `postcss.config.mjs`), no separate
  `tailwind.config` — v4 configures via CSS (`src/app/globals.css`).
- Path alias: `@/*` → `./src/*` (see `tsconfig.json`).

## Environment variables

Required in `.env` (see `.env.example` for a template — values are not committed):

- `DATABASE_URL`, `DIRECT_URL` — Postgres connection strings (Prisma)
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` — NextAuth session signing/callback base URL
- `RESEND_API_KEY` — transactional email (Resend)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — product image uploads/delivery
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` — same cloud name, exposed to the browser for `next-cloudinary`'s
  client components (`CldImage`/`CldVideoPlayer`); not a secret

## Commit message format

Every commit message must start with one of these prefixes:

- `Update: ` — changes to existing behavior/code
- `Add: ` — new files, features, or capabilities
- `Delete: ` — removing code, files, or features

Example: `Update: show pregnancy status options only for female patients`
