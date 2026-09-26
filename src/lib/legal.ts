// Versions of the legal pages (/privacy, /terms, /disclaimer). Bump the matching
// constant in the same commit as any wording change: new consents record the
// new version, and git history keeps what each version said (spec 0001).
export const PRIVACY_VERSION = "2026-09-26";
export const TERMS_VERSION = "2026-09-26";
export const DISCLAIMER_VERSION = "2026-09-26";

export const CONSENT_REQUIRED_MESSAGE = "Please agree to the Privacy Notice to continue.";

// "2026-09-26" → "September 26, 2026" (fixed zone, so server and client agree).
export function formatEffectiveDate(version: string): string {
  return new Date(`${version}T00:00:00+08:00`).toLocaleDateString("en-PH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Manila",
  });
}

// The proof line on admin detail panels. Rows saved before spec 0001 have no consent.
export function formatConsentLine(privacyVersion: string | null, consentedAt: string | Date | null): string {
  if (!privacyVersion || !consentedAt) return "No consent recorded";
  return `Privacy v${privacyVersion} at ${new Date(consentedAt).toLocaleString("en-PH")}`;
}

// Server side stamp for a public form's consent. Strictly `true`: the strings
// "true" or "on" do not count. The version always comes from here, never the request.
export function readConsent(value: unknown, now = new Date()) {
  if (value !== true) return null;
  return { privacyVersion: PRIVACY_VERSION, consentedAt: now };
}
