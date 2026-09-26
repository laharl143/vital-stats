import assert from "node:assert/strict";
import { test } from "node:test";
import { PRIVACY_VERSION, formatConsentLine, formatEffectiveDate, readConsent } from "./legal";

test("readConsent stamps the current privacy version and the given time for true", () => {
  const now = new Date("2026-09-26T10:00:00Z");
  assert.deepEqual(readConsent(true, now), { privacyVersion: PRIVACY_VERSION, consentedAt: now });
});

test("readConsent refuses anything that is not exactly true", () => {
  for (const value of [undefined, null, false, "true", "on", 1, {}]) {
    assert.equal(readConsent(value), null, `expected null for ${JSON.stringify(value)}`);
  }
});

test("formatConsentLine shows the version, or says none for rows saved before consent existed", () => {
  assert.match(formatConsentLine("2026-09-26", "2026-09-26T02:00:00.000Z"), /^Privacy v2026-09-26 at /);
  assert.equal(formatConsentLine(null, null), "No consent recorded");
  assert.equal(formatConsentLine("2026-09-26", null), "No consent recorded");
});

test("formatEffectiveDate shows the version as a Manila calendar date", () => {
  assert.equal(formatEffectiveDate("2026-09-26"), "September 26, 2026");
});
