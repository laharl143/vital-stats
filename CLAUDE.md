# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## ⚠️ Non-standard Next.js version

This project pins `next@16.2.4`, `react@19.2.4`, and `react-dom@19.2.4` — versions ahead of this
model's training data. Per `AGENTS.md`, consult `node_modules/next/dist/docs/` for any API you're
unsure about (routing, middleware, config, data fetching) rather than assuming conventions from
older Next.js. Pay attention to deprecation notices.

## GSAP

When writing or reviewing GSAP code, always consult the context7 MCP server for up-to-date docs
before answering.

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

## Verification workflow

**Never run Playwright (or any other automated browser check) without asking first — every
single time, no exceptions.** This means literally stopping after the code change and asking a
real question (via the question/options UI, not just proposing it in a text message and
proceeding), before invoking Playwright at all — not just before reporting results. Do not treat
an earlier "run a Playwright check myself" answer as blanket permission for later changes in the
same session; each change gets its own ask. Options to present:

- "Run a Playwright check myself" — you drive it end-to-end and report results
- "I'll test it manually" — you stop and let them click through it themselves
- "Skip verification for now"

Wait for their choice before running anything. This comes before the commit step below —
verification method is a separate decision from whether the fix is confirmed good.

**Never kill the dev server after finishing a fix.** Ed and Josh keep it running to continuously
click through the site themselves as work lands — stopping it out from under them is disruptive.
Leave `npm run dev` running once it's up; only stop it if explicitly asked to, or if you need to
restart it to pick up a config change (e.g. `.env`, `next.config`) that hot-reload won't catch —
and in that case, start it back up again immediately after.

## Commit message format

**Never commit automatically.** Make the code change and, if you tested it, report what you did
and what you found — then stop and wait for Ed or Josh to explicitly confirm the fix is good
before running `git commit`. Finishing a fix and verifying it (including automated checks like
Playwright) is not the same as being told to commit it. This applies even when a Jira ticket
exists for the work — don't commit just because a ticket is being closed out.

Every commit message must start with the Jira issue key in brackets, followed by one of these
prefixes:

- `[VS-##] Update: ` — changes to existing behavior/code
- `[VS-##] Add: ` — new files, features, or capabilities
- `[VS-##] Delete: ` — removing code, files, or features
- `[VS-##] Fix: ` — bug fixes

Example: `[VS-15] Fix: show pregnancy status options only for female patients`

Once committed, push right away — don't leave confirmed, committed work sitting local-only.

## Jira workflow

Project: **VS** (Vital Stats Dev Team) on `vital-stats.atlassian.net`. Board columns: To Do →
In Progress → In Review → Done, plus Blocked.

- **Every change the user asks for — minor or major — gets a Jira issue.** Create it even if the
  request came as a quick one-off ask in conversation, not just for planned/ticketed work.
- **Before starting any work on an existing issue (planning, implementation, anything beyond
  filing it), transition it to In Progress first — not after, not as a batch cleanup later.**
  This applies even mid-session to an issue that was filed earlier in the same conversation.
- Set the issue's column to match where the work actually stands right when it's created or
  updated, not always To Do:
  - **To Do** — issue filed but work hasn't started yet
  - **In Progress** — actively investigating, implementing, or awaiting confirmation that a fix
    is correct. **Stay here even after the fix is implemented and self-tested** (manual QA,
    Playwright, etc.) — being confident in a fix is not the same as it being confirmed.
  - **Done** — only after ALL of the following happened, in order: (1) Ed or Josh explicitly
    confirms the fix/feature is correct, (2) the code is committed, (3) the commit is pushed to
    `origin/main`. Never jump straight to Done off of your own testing.
  - **Blocked** — can't proceed (missing input, external dependency, waiting on a decision)
- Keep the issue's status in sync as work moves forward — don't leave it stale in the wrong column.
- Ed (developer) and Josh (owner) are the two people on this project.
