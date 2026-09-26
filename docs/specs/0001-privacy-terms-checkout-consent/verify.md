# Verify: privacy notice, terms and checkout consent · spec 0001 · updated 2026-09-26
_Steps derived from spec 0001 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

First run on 2026-09-26 by `/develop` in the built in browser pane (Playwright MCP was not connected), after restarting the dev server so it loaded the new Prisma client. Ticked steps passed; unticked steps still need a person.

## UI / manual
- [x] Open `/privacy`, `/terms`, `/disclaimer` signed out → each returns 200 with its own title, description and canonical link, "Effective September 26, 2026 · Version 2026-09-26", and the "Draft, pending legal review" note, all in the server HTML → AC-1
- [x] Footer links Medical Disclaimer, Privacy Policy, Terms of Use → all three open real pages → AC-2
- [x] `/privacy` lists who we are (with DPO placeholder), what we collect, purposes and basis, recipients (OMS, Google Apps Script, Resend, couriers, payment provider, Supabase, Vercel, Vercel Analytics), retention (placeholders), protection, rights, changes → AC-3
- [x] `/terms` covers guest ordering, payment (online and COD), stock confirmed after the order, prescription review, delivery, full refund on cancel or reject, and links the disclaimer → AC-4
- [x] `/book-consult`: a fourth checkbox in the consent group names health information and links the Privacy Notice; it is `required` and joins `consentInvalid` → AC-5
- [ ] `/book-consult`: fill the whole form except the new box, press submit → the page scrolls to the consent group with the red outline, nothing is sent → AC-5 (not driven: the form has about 25 custom controls; the save path was checked through the API instead)
- [x] `/contact`: fill every field, leave the box unticked, press Send → the browser blocks it ("Please check this box if you want to proceed.") and the typed values stay → AC-6
- [x] `/contact`: tick the box, send → "Inquiry received!" and the row has `privacyVersion = 2026-09-26` and server `consentedAt` (TEST row "TEST Consent Contact") → AC-6, AC-8
- [x] Every Privacy Notice link inside a form or its notes has `target="_blank"` and `rel="noopener noreferrer"` (4 on book consult, 1 on contact) → AC-9
- [ ] Signed in as admin, open the consult "TEST Consent Consult" (VS-2026-0926-109) → the detail panel shows "Consent: Privacy v2026-09-26 at <time>" → AC-10 (skipped 2026-09-27 on Ed's call; the formatter is unit tested)
- [ ] Signed in as admin, open the inquiry "TEST Consent Contact" → the same line; open any older inquiry or consult → "No consent recorded" → AC-10, AC-12 (skipped 2026-09-27 on Ed's call)
- [x] Signed out, `/admin/inquiries` redirects to `/admin/login` → AC-10 (the consent line is admin only)

## Commands
- [x] `npm test` → 59 pass, including `src/lib/legal.test.ts` (`readConsent` strict true, `formatConsentLine`, `formatEffectiveDate`) → AC-7, AC-8, AC-10, AC-11
- [x] `npx tsc --noEmit` and eslint on the changed files → clean → AC-11
- [x] POST `/api/submit-form` and `/api/inquiries` with `privacyConsent` missing, `false`, `"true"`, `"on"` and `1` → all 400 with "Please agree to the Privacy Notice to continue." (`{ success: false, error }` and `{ error }` respectively), and no TEST row saved → AC-7
- [x] POST `/api/submit-form` with `privacyConsent: true` and a full TEST consult → 200, row saved with `privacyVersion = 2026-09-26` and server `consentedAt` → AC-8
- [x] Live schema: `Inquiry` and `MedicalHistory` have nullable `privacyVersion` (text) and `consentedAt` (timestamp); migration `20260926120000_add_privacy_consent_columns` applied → AC-8, AC-12
- [x] Older rows untouched: 4 inquiries and 98 consults still have null consent → AC-12

## Value sourcing checks
- [x] `privacyVersion` comes from `PRIVACY_VERSION`, not the request: saved value is `2026-09-26` although the request never sent a version → AC-8
- [x] `consentedAt` is server time (`readConsent`'s `now`), within a second of `createdAt` → AC-8
- [x] Consent given only by `privacyConsent === true`: strings and numbers refused → AC-7
- [x] Page version and effective date read the same constant as the stamp → AC-1
- [ ] DPO contact, business name and address, retention periods, response time, refund timeline: still placeholders for the owner at legal review → AC-3 (by design, see Follow-up)
- [ ] Admin line time uses `toLocaleString("en-PH")`, same as "Received" → AC-10 (needs Ed's admin login)

## Test data created (safe to delete)
- Inquiry "TEST Consent Contact" (`cmuiknl1w0000izxw795s16qm`)
- Consult "TEST Consent Consult" (`cmuikp6qs0001izxwluffs8dr`, VS-2026-0926-109). Its admin email and Google Sheet row were also sent.

## Acceptance-criteria coverage
- AC-1 pages · AC-2 footer · AC-3 privacy content · AC-4 terms content · AC-5 consult box (submit block step open) · AC-6 contact · AC-7 API refusal · AC-8 stamp · AC-9 new tab links · AC-10 admin line (open, needs login) · AC-11 shared pieces · AC-12 old rows
