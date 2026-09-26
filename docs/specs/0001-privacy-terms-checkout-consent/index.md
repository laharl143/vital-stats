# 0001. Privacy notice, terms and consent recorded on each submission

**Date**: 2026-09-26
**Status**: Accepted

## Summary

The storefront gets real Privacy Notice, Terms and Medical Disclaimer pages (the footer already links to them, but they 404 today). Every public form that collects personal data gets one required consent checkbox, and the server stamps the document version and the time onto the saved row, so each submission carries its own proof of consent. This feature retrofits the book consult form (health data) and the contact form now, and gives checkout (VS-254), sign up (VS-260) and prescription upload (VS-259) one helper and one checkbox component to reuse. The page text is a draft for legal review, clearly marked as one, because legal review under RA 10173 is already an owner step before go live.

## Requirements

**User stories**:
- As a visitor, I want to read what VitalStats does with my data and the rules of buying, before I give any details, so I can decide whether to go ahead.
- As a customer filling in a form, I want one clear consent checkbox with links I can open without losing what I typed, so agreeing is quick and informed.
- As the VitalStats owner, I want every submission to carry which version of the notice the person agreed to and when, so I can prove consent if it is ever questioned.
- As the builder of checkout, sign up and prescription upload, I want a ready consent helper and checkbox, so each new form records consent the same way.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: `/privacy`, `/terms` and `/disclaimer` are public pages (no sign in), render on the server, have their own page title and description, and each shows its version and effective date plus a visible "Draft, pending legal review" note.
- **AC-2**: The existing footer links to all three pages resolve (no 404).
- **AC-3**: The privacy notice covers, for what the site collects today and in Phase 7: who controls the data and how to reach them (with a clearly marked placeholder for the data protection officer contact), what is collected (identity and contact, delivery address, health answers, order details, prescription files later), why (consult assessment, order fulfilment, customer contact), the legal basis (consent for health data, the contract for orders), who receives it (the VitalStats order system, the Google Apps Script sheet, Resend for email, couriers, the payment provider once chosen, Vercel and Supabase as hosts, and Vercel Analytics, which is cookieless but still sees request data such as IP address), retention (marked placeholder), the data subject rights (access, correction, erasure, objection, portability, complaint to the National Privacy Commission) and how to exercise them.
- **AC-4**: The terms cover guest checkout, paying at checkout, cash on delivery, that stock is confirmed by the order system after payment, prescription review, full refund on cancel or reject, delivery, and a medical disclaimer pointer.
- **AC-5**: The book consult form shows one extra required checkbox that explicitly names health information and links the Privacy Notice. The form cannot be submitted without it (same inline error pattern as the existing consent block), and the existing three medical acknowledgements stay unchanged.
- **AC-6**: The contact form shows one required checkbox linking the Privacy Notice and cannot be submitted without it.
- **AC-7**: `POST /api/submit-form` and `POST /api/inquiries` reject a request whose `privacyConsent` is not exactly `true` with status 400 and a readable error, before any row is saved, any email is sent, or anything is forwarded to the Apps Script.
- **AC-8**: When consent is given, the saved `MedicalHistory` or `Inquiry` row stores `privacyVersion` (the current version constant, set by the server, never taken from the request) and `consentedAt` (the server time).
- **AC-9**: Every consent link opens in a new tab, so the typed form data is not lost.
- **AC-10**: The detail panel on the admin consult list (`src/app/admin/medical-history/page.tsx`) and on the admin inquiry list (`src/app/admin/inquiries/page.tsx`) each show one line: "Consent: privacy vYYYY-MM-DD at <date time>", or "No consent recorded" for rows saved before this feature.
- **AC-11**: A shared `ConsentCheckbox` component and a shared `readConsent` server helper exist and are what AC-5 to AC-8 use, so checkout, sign up and prescription upload can reuse them (their wiring is part of those features, see Follow-up).
- **AC-12**: Rows saved before this feature keep `privacyVersion` and `consentedAt` empty (null); no existing row is changed.

## Decision

**Chosen option**: Option 1: Consent columns on each saved row, version constants in code

The storefront stores `privacyVersion` and `consentedAt` on every row a public form creates, stamps them on the server from constants in `src/lib/legal.ts`, and serves the legal pages as static server components whose text lives in the repo.

Picks made on the owner's instruction to take the recommended option throughout (override any of them):
- **Legal text**: drafted by Claude from what the site actually collects, marked "Draft, pending legal review" on each page. Runner up: owner supplies final text (blocks the build).
- **Where consent goes now**: retrofit book consult and contact, plus the reusable pieces. Runner up: book consult only.
- **Checkout granularity**: one required box, "I agree to the Terms and have read the Privacy Notice". Runner up: two separate boxes (more friction, not legally required).
- **Analytics**: no banner. Vercel Analytics is cookieless, so it is disclosed in the notice, and 7.7 promises no personal or health data in events. Runner up: an opt out switch on the privacy page.
- **Page format**: plain TSX server components, statically rendered. Runner up: MDX (a new dependency for three pages).
- **Medical disclaimer page**: included, because the footer already links it and it is one short page. Runner up: remove the footer link.
- **Consult consent wording**: one combined box that names health information explicitly ("I consent to VitalStats collecting and using my health information to assess my consult, as described in the Privacy Notice"). Runner up: separate privacy and health boxes (the whole form is health data, so two boxes say the same thing).
- **Admin proof line**: shown on consult and inquiry details. Runner up: database only (proof you can't see without SQL).
- **Page design source**: the existing site styling (`globals.css` tokens, the Navbar and Footer already in `layout.tsx`), a simple readable prose column. No new design tool.
- **References level**: none.

## Feature design

**Data model sketch** (one migration, nullable columns only, no existing row touched):

| Table | New column | Type | Null | Notes |
|---|---|---|---|---|
| `MedicalHistory` | `privacyVersion` | `String` | nullable | e.g. `2026-09-27`; null for rows before this feature |
| `MedicalHistory` | `consentedAt` | `DateTime` | nullable | server time at save |
| `Inquiry` | `privacyVersion` | `String` | nullable | as above |
| `Inquiry` | `consentedAt` | `DateTime` | nullable | as above |

Existing `consent1` to `consent3` on `MedicalHistory` stay as they are (medical acknowledgements, a different thing). No indexes: these columns are only read with their row. No new relations.

Planned by later features, same pattern (not in this migration): `Order.privacyVersion`, `Order.termsVersion`, `Order.consentedAt` (7.3 checkout); `Order.healthConsentVersion`, `Order.healthConsentAt` (7.12 prescription upload); the same privacy and terms columns on the customer account model (7.13).

**State transitions**: none. Consent is written once when the row is created and never changed.

**Shared code**:
- `src/lib/legal.ts`: `PRIVACY_VERSION`, `TERMS_VERSION`, `DISCLAIMER_VERSION` (date strings, `YYYY-MM-DD`), and `readConsent(value: unknown, now = new Date())`, which returns `{ privacyVersion: PRIVACY_VERSION, consentedAt: now }` only when `value === true`, else `null`. Strict `=== true`: the strings `"true"` or `"on"` do not count.
- `src/components/ConsentCheckbox.tsx`: a client component taking `checked`, `onChange`, optional `invalid` (default `false`) and `children` (the label, which contains the links). The input always carries the native `required` attribute. Links inside it use `target="_blank" rel="noopener noreferrer"`. Styling follows the existing consult consent block (teal accent, red outline when `invalid`).
- Book consult passes `invalid={submitAttempted && consentInvalid}` and joins the existing scroll to first invalid field logic (its `consentInvalid` gains the new box). The contact form has no such logic today and does not grow any: it relies on the native `required` attribute, the same way its other fields do, and omits `invalid`.
- `src/lib/legal.ts` also exports `CONSENT_REQUIRED_MESSAGE = "Please agree to the Privacy Notice to continue."`.

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/submit-form` | POST | existing fields, `privacyConsent: boolean` (req, must be `true`) | unchanged | public, rate limited (existing, 3 per hour per IP) | 400 "Please agree to the Privacy Notice to continue" when not `true`; existing 400 and 429 |
| `/api/inquiries` | POST | `name`, `contactInfo`, `message` (req), `privacyConsent: boolean` (req, must be `true`) | unchanged | public, rate limited (existing) | 400 same message; existing 400 and 429 |
| `/privacy`, `/terms`, `/disclaimer` | GET (pages) | none | static HTML with `metadata` title and description | public | none |

Where the check goes, exactly:
- `privacyConsent` is validated only through `readConsent()`. It is never added to `REQUIRED_FIELDS` or any truthy check (`!data[field]` would let the string `"true"` through). It is not added to the Apps Script whitelist (`ALLOWED_FIELDS`) either; the sheet does not need it.
- `/api/submit-form`: right after the date of birth check and before the IP rate limit count, so it runs after every other field check and before the save, `notifyAdmin` and the Apps Script forward. The response keeps this route's envelope: `{ success: false, error }`.
- `/api/inquiries` POST: right after the existing length check (`name.length > 100 …`) and before the IP rate limit count. The response keeps this route's envelope: `{ error }`.
- Both use the same message string, exported from `src/lib/legal.ts` as `CONSENT_REQUIRED_MESSAGE`.

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Save consult or inquiry | `privacyVersion` | `PRIVACY_VERSION` constant in `src/lib/legal.ts` (never the request) |
| Save consult or inquiry | `consentedAt` | server `new Date()` at the save, via `readConsent` |
| Save consult or inquiry | whether consent was given | request body `privacyConsent`, strictly `true` |
| Legal page | version and effective date shown | the same constant; the effective date is the constant formatted as a date |
| Legal page | data protection officer contact, retention periods | marked placeholders in the draft text, filled by the owner at legal review (Follow-up) |
| Privacy notice | list of recipients | this spec's AC-3 list, from the code today (`APPS_SCRIPT_FORM_URL`, Resend, Supabase, Vercel, the OMS) plus the payment provider named in 7.5 |
| Admin detail line | version and time | `privacyVersion` and `consentedAt` columns; the time is formatted with `.toLocaleString("en-PH")`, the same as the existing "Received" line on those panels; null shows "No consent recorded" |

**Key invariants**:
- A new `MedicalHistory` or `Inquiry` row created through the public endpoints always has both `privacyVersion` and `consentedAt` set (enforced in the route, before the save).
- The version stored is always the version the site served at that moment; the client cannot choose it.
- Changing a legal page's text means bumping its constant in the same commit. New consents record the new version; old rows keep theirs.
- Nothing is sent to the Apps Script, Resend or the database for a request without consent.

**Security model**: Legal pages are public. The consent fields are written only by the server inside the public POST routes and read only on admin pages, which are already gated by `src/middleware.ts` and `requireAdminSession`. Compliance scope: RA 10173, with `MedicalHistory` holding sensitive personal information (health). No new data is collected by this feature. It only records consent for data already collected. Audit: the consent columns are themselves the audit record of consent. No other mutation is added.

**Configuration required**: none (no new environment variables).

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: submit the consult form with all boxes ticked; the new row has `privacyVersion` equal to `PRIVACY_VERSION` and `consentedAt` within a few seconds of now; the admin detail shows the consent line. Verifies **AC-5**, **AC-8**, **AC-10**
- Failure case: POST to `/api/submit-form` directly with `privacyConsent` missing, `false`, or `"true"`; the response is 400, no row is added, and no Apps Script call or admin email happens. Same for `/api/inquiries`. Verifies **AC-7**
- Unit: `readConsent` returns the stamped object for `true` and `null` for `undefined`, `false`, `"true"`, `"on"`, `1`. Verifies **AC-7**, **AC-8**
- Form UX: ticking nothing and pressing submit scrolls to the consent box with the red outline; clicking the Privacy Notice link opens a new tab and the form keeps its values. Verifies **AC-5**, **AC-6**, **AC-9**
- Pages: `/privacy`, `/terms`, `/disclaimer` load signed out, show the version and the draft note; the footer links resolve. Verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**
- Old data: an existing consult from before the migration shows "No consent recorded" and its columns are null. Verifies **AC-10**, **AC-12**
- Auth/permission: the consent line is only visible on admin pages; a signed out request to the admin consult page is redirected to `/admin/login` (existing middleware). Verifies **AC-10**

## Build plan

The build approach is Journey (one complete customer path per phase). This feature is the first stop on Journey 1, so it is built as one end to end slice: the shared pieces first, then each form wired end to end through the database.

1. [x] Add `src/lib/legal.ts` (version constants, `CONSENT_REQUIRED_MESSAGE` and `readConsent`) and `src/lib/legal.test.ts` (node:test), and add the test file to the `test` script in `package.json`. Satisfies **AC-7**, **AC-8**, **AC-11**
2. [x] Write `/privacy`, `/terms` and `/disclaimer` as server component pages with `metadata`, reading the version constants, with the draft note, placeholders for the data protection officer contact and retention, and the content listed in AC-3 and AC-4. Satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**
3. [x] Migration `add_privacy_consent_columns`: the four nullable columns in the data model sketch. Only adds columns, so it is safe on the shared Supabase database. Satisfies **AC-8**, **AC-12**
4. [x] Add `src/components/ConsentCheckbox.tsx`. Satisfies **AC-9**, **AC-11**
5. [x] Book consult: add the health information consent box with `ConsentCheckbox` into the existing consent block and its `consentInvalid` check; send `privacyConsent`. In `/api/submit-form`, reject without consent before anything else is saved or sent, and store `readConsent`'s fields. Satisfies **AC-5**, **AC-7**, **AC-8**, **AC-9**
6. [x] Contact: add `ConsentCheckbox`, block submit without it, send `privacyConsent`. In `POST /api/inquiries`, reject and stamp the same way. Satisfies **AC-6**, **AC-7**, **AC-8**, **AC-9**
7. [x] The detail panels in `src/app/admin/medical-history/page.tsx` and `src/app/admin/inquiries/page.tsx`: show the consent line or "No consent recorded". Satisfies **AC-10**, **AC-12**

## Consequences

**Positive**:
- The one live health data form gets recorded consent right away, before checkout adds more data.
- Checkout, sign up and prescription upload each need only a checkbox, a `readConsent` call and their own columns.
- The footer stops linking to 404 pages.

**Negative / tradeoffs**:
- The text is a draft. It must go through the legal review owner step before real customers rely on it, and the data protection officer contact and retention periods are placeholders until then.
- Consent columns repeat across tables. A future withdrawal or marketing preferences feature would want a proper consent log (Option 2) and a data backfill.
- Changing a page's wording without bumping its constant would silently record the wrong version. This rests on review discipline (a comment at the top of each page says so).
- Past consult rows have no consent record, and nothing can fix that retroactively.
- A browser tab left open across the deploy sends the old payload without `privacyConsent` and gets the 400. The form shows its existing error message, and a reload fixes it.
- The existing rate limit (3 per hour per IP) counts only saved rows, so rejected requests (including the new no consent 400) are never throttled. This was already true before this feature and this spec does not change it; it costs a cheap request, not a write.

**Neutral**:
- One migration of nullable columns, applied to the Supabase database that is also production. It adds only, and no existing row changes.
- The contact form gains a checkbox, a small amount of extra friction on a low risk form.

## Follow-up

- [ ] Owner: legal review of the three pages under RA 10173, fill in the data protection officer contact and retention periods, then remove the draft note and bump the versions (already on the scope's "Before go live" list).
- [ ] 7.3 Checkout (VS-254): use `ConsentCheckbox` with the one box "I agree to the Terms and have read the Privacy Notice", call `readConsent`, and add `Order.privacyVersion`, `Order.termsVersion`, `Order.consentedAt` (also link the pages from the checkout page).
- [ ] 7.12 Prescription step (VS-259): a separate health data `ConsentCheckbox` shown before the upload, stored as `Order.healthConsentVersion` and `Order.healthConsentAt`.
- [ ] 7.13 Customer accounts (VS-260): the same privacy and terms columns on the customer account, stamped at sign up.
- [ ] 7.5 Online payment (VS-255): name the chosen payment provider in the privacy notice and bump `PRIVACY_VERSION`.
- [ ] 7.7 Analytics (VS-257): "respect the consent choice from 7.1" now means no personal or health data in any event, and no cookie based tracker without first revisiting this spec.
- [ ] Admin created orders (`NewOrderForm`) have no online consent, since the customer agrees by phone or chat. Consider whether staff should tick "customer was told about the Privacy Notice" when checkout lands.
## Rationale

Reasoning and options: see [rationale.md](rationale.md).
