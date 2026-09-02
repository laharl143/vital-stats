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
    `src/proxy.ts` (Next.js 16's `proxy.ts` convention; matches everything under `/admin/` except
    `/admin/login`) using `next-auth`'s `withAuth`.
  - `src/app/api/*` — route handlers for `products`, `orders`, `inquiries`, `medical-history`,
    `submit-form`, and NextAuth (`api/auth/[...nextauth]`). Handlers follow a consistent shape:
    parse `NextRequest`, hit Prisma, return `NextResponse.json({ data | error }, { status })`,
    with try/catch logging as `[METHOD /api/path]`.
- **`src/lib/prisma.ts`** — singleton `PrismaClient`, cached on `globalThis` to survive dev
  hot-reload. Always import `prisma` from here rather than instantiating a new client.
- **`src/lib/auth.ts`** — NextAuth config (`authOptions`): JWT sessions, Prisma adapter,
  credentials provider. `authorize()` matches passcodes against the dedicated
  `User.hashedPassword` column via `bcrypt.compare`.
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
an earlier "let the current agent run Playwright end-to-end" answer as blanket permission for
later changes in the same session; each change gets its own ask. Options to present:

- "Let the current agent run Playwright end-to-end to double-check functionality" — you drive it
  end-to-end and report results
- "I'll test it manually" — you stop and let them click through it themselves
- "Skip verification for now"

Wait for their choice before running anything. This comes before the commit step below —
verification method is a separate decision from whether the fix is confirmed good.

**Exception — unattended/automated sessions:** the ask-first rule above applies to
interactive sessions with Ed. A non-interactive/automated agent run (e.g. a scheduled
routine with no one to ask) may use Playwright without asking, but only during these
windows, Philippines time (UTC+8): 7:00-10:00 AM, 12:00-1:00 PM, 12:30-1:30 AM, and
5:00-6:00 PM. Outside these
windows, automated sessions must skip Playwright verification rather than ask — there's
no one to answer. This exception does not change anything for interactive sessions —
still ask every time.

An automated session must not stop a dev server it didn't start (it may already be Ed's).
If Playwright verification needs a running server, check whether one is already running
first; if not, start a temporary instance and stop only that instance when the run ends.

**No staging environment exists — the local dev database (Supabase) is the real production
database.** There is no separate test DB to point at. When Playwright (or any verification)
needs to exercise a route that writes data, creating new test records is fine — INSERT-style
writes are reversible, Ed can delete them any time. Use an obviously-fake identifier when
creating test data (e.g. a name/email containing "TEST") so it's easy to spot and clean up.
**Never perform a destructive operation** (DELETE, bulk update, or anything that mutates or
removes existing real records) against this database during verification, interactive or
automated. Incidental side effects from exercising a normal write path (e.g. an admin
notification firing, an external webhook call) are acceptable — the concern is only ever
data loss/destruction, not creating extra test rows or a stray notification.

**Never kill the dev server after finishing a fix.** Ed keeps it running to continuously click
through the site as work lands — stopping it out from under him is disruptive. Leave `npm run dev`
running once it's up; only stop it if explicitly asked to, or if you need to restart it to pick up
a config change (e.g. `.env`, `next.config`) that hot-reload won't catch — and in that case, start
it back up again immediately after.

## Ponytail (YAGNI enforcement)

The `ponytail` plugin (project-scoped, see `.claude/settings.json`) auto-injects a
"lazy senior dev" ruleset every session: does the code need to exist at all, does it
already live in this codebase, does stdlib/a native platform feature/an already-installed
dependency cover it, before writing anything new. It runs at intensity `full` by default —
switch for a session with `/ponytail lite|full|ultra|off`. This reinforces the "Doing
tasks" philosophy above rather than replacing it, and never overrides the workflow rules
in this file (commit/push, Playwright, Jira) — those are a separate axis.

- `/ponytail-review` — fast, diff-level "what can be cut" check. Use it as a quick
  self-check during active dev; it does **not** replace `/review-pr`, which stays the
  required production-safety + structural gate before merging.
- `/ponytail-audit` — same scan across the whole repo. Use occasionally (e.g. before a
  larger refactor), not as a per-PR step.
- `/ponytail-debt` — harvests inline `ponytail: <what was cut>, <upgrade path>` comments
  into a ledger. Use that comment convention when deliberately taking a shortcut with a
  known ceiling, and check `/ponytail-debt` periodically to see what's been deferred.

## Commit message format

**Never commit automatically.** Make the code change and, if you tested it, report what you did
and what you found — then stop and wait for Ed to explicitly confirm the fix is good before
running `git commit`. Finishing a fix and verifying it (including automated checks like
Playwright) is not the same as being told to commit it. This applies even when a Jira ticket
exists for the work — don't commit just because a ticket is being closed out.

**Exception — auto-fix routine (unattended):** the scheduled auto-fix routine (the one that
works `routine-agent-vs-{ticket}` branches) may commit and push its own branch and open a pull
request against `main`, without asking, once its fix is verified end-to-end — this is a standing
exception Ed has approved specifically for that routine, so he can review the change as a normal
PR instead of a raw branch diff. Even under this exception it must: use the commit message format
below (`[VS-##]` prefix, also as the PR title), never touch `main` directly, never force-push,
never merge or approve the PR itself, and never treat the ticket as Done — Jira only reaches Done
after Ed reviews, confirms, and merges the PR (see Jira workflow below). If verification fails, it
must not commit, push, or open a PR. This exception is scoped to that one routine — every other
automated or interactive session still never commits, pushes, or opens PRs without Ed's explicit
go-ahead, no exceptions.

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
  - **Done** — only after ALL of the following happened, in order: (1) Ed explicitly confirms the
    fix/feature is correct, (2) the code is committed, (3) the commit is pushed to `origin/main`.
    Never jump straight to Done off of your own testing.
  - **Blocked** — can't proceed (missing input, external dependency, waiting on a decision)
- Keep the issue's status in sync as work moves forward — don't leave it stale in the wrong column.
- Ed (developer) is the point of contact for this project.
- **Don't self-schedule periodic check-ins (`send_later`, polling reminders) to watch for a PR's
  merge/close status.** A dedicated "Jira PR status sync" routine already handles this — it's
  triggered instantly by a GitHub webhook on `pull_request` events, extracts the `[VS-##]` key
  from the PR title, and moves the ticket to Done (merged) or Cancelled (closed unmerged) with a
  comment. Opening a PR in any session does not need a follow-up self-poll for this purpose.
