# 0001. Privacy notice, terms and consent recorded on each submission: decision record

## Context

The Philippine Data Privacy Act (RA 10173, the law on how personal data is collected and used) requires a clear privacy notice before personal data is collected, and consent that is freely given, specific and informed, with extra care for sensitive personal information such as health data. It also puts the burden of proof on the business: if a customer disputes consent, the business has to show what the customer agreed to and when.

Today the storefront already collects personal data in two public places. The book consult form (`/book-consult`, posts to `/api/submit-form`) collects name, birth date, phone, email, BMI and yes or no medical answers, saves them to `MedicalHistory`, and forwards a copy to an external Google Apps Script (`APPS_SCRIPT_FORM_URL`). Its three checkboxes (`consent1` to `consent3`) are medical acknowledgements ("I understand side effects…"), not consent to data processing, and no version or time is stored. The contact form (`/contact`, posts to `/api/inquiries`) collects name, contact details and a message into `Inquiry`. The footer links `/privacy`, `/terms` and `/disclaimer`, but none of those routes exist. Vercel Analytics runs on every page.

Phase 7 (OMS repo `docs/scope/scope.md`, feature 7.1) adds guest checkout, customer accounts and prescription upload, which all collect more personal and health data. Those features are built after this one (Journey build approach: 7.1, then cart, then checkout). They need a consent mechanism in place to plug into, not one invented three times.

Not deciding means checkout ships with no recorded consent, the consult form keeps collecting health data without it, and the footer keeps sending people to three 404 pages.

## Options considered

### Option 1: Consent columns on each saved row, version constants in code

Each table that stores a submission gets two nullable columns, `privacyVersion` and `consentedAt` (orders also get `termsVersion` in 7.3). The current document versions live as constants in `src/lib/legal.ts`, next to nothing else. The server stamps them when it saves the row.

**Pros**:
- Matches the scope wording ("stored with the order or account"): the proof sits on the record it belongs to, read with no join.
- One small migration of nullable columns, no new table, nothing to keep in sync.
- The version constant and the page's displayed version come from the same place, so they cannot drift.

**Cons**:
- The same two columns repeat on several tables (Inquiry, MedicalHistory, then Order and the customer account).
- No history of consent changes over time on one record; a withdrawal flow would need more later.

### Option 2: One `ConsentRecord` log table

A single append only table (`subjectType`, `subjectId`, `purpose`, `documentVersion`, `grantedAt`, `withdrawnAt`) that every form writes to, linked by a soft reference.

**Pros**:
- One place to query all consent, ready for withdrawal and re consent flows.
- Adding a new purpose (marketing, analytics) needs no migration.

**Cons**:
- A polymorphic soft reference (no real foreign key) that can point at rows that no longer exist, and two writes that must happen in one transaction on every form.
- Built for withdrawal and marketing flows that nothing in Phase 7 needs (YAGNI).

### Option 3: Consent table plus versioned documents stored in the database

Option 2, plus the privacy and terms text stored as rows with a version, edited from the admin panel.

**Pros**:
- The exact text for any version is in the database, and the owner can edit it without a deploy.

**Cons**:
- An admin editor, rich text storage and rendering for text that changes a few times a year.
- Git already keeps every past version of a page file, with author and date.

## Rationale

The forces here are small and specific: a handful of forms, text that changes rarely, a legal duty to prove what each person agreed to and when, and a Journey plan where three later features must reuse whatever this one builds. Option 1 meets the proof duty with the least machinery. The version and the time sit on the very row the customer created, and the server sets both, so a client cannot fake an older or newer version. Options 2 and 3 are built for consent withdrawal, marketing preferences and editing the text from the admin panel, and nothing in Phase 7 asks for any of those. They would add a polymorphic table (a table whose reference column can point at several different tables, with no real foreign key) and an admin editor, for no customer visible gain.

Keeping the text in TSX files under git means every past version is recoverable with its date, which answers "what did version 2026-09-27 say" without storing documents in the database. Putting the version constant in `src/lib/legal.ts`, and having both the page and the server stamp read it, removes the one real risk of this approach: a page showing one version while the database records another.

Retrofitting the consult form now, not waiting for checkout, follows from the evidence. It is the one place the storefront already collects health data, and it forwards that data to a Google Apps Script, so it carries the most risk today. The contact form is cheap to fix with the same two pieces, and doing both proves the component and helper before checkout depends on them.

