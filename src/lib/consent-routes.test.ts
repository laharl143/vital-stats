/* eslint-disable @typescript-eslint/no-require-imports */
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { NextRequest } from "next/server";
import { CONSENT_REQUIRED_MESSAGE, PRIVACY_VERSION } from "./legal";

// Spec 0001: the public consult and contact routes refuse a submission without privacy
// consent before anything is saved, emailed or forwarded, and stamp the server's version
// and time when consent is given. Both routes run for real against an in-memory database.

type Row = Record<string, unknown>;
let created: { consult: Row[]; inquiry: Row[] };
let counted: number;
let emails: unknown[];
let forwarded: Row[];

const fakePrisma = {
  medicalHistory: {
    count: async () => { counted++; return 0; },
    create: async ({ data }: { data: Row }) => {
      created.consult.push(data);
      return { ...data, sequence: 7, createdAt: new Date("2026-09-26T02:00:00Z") };
    },
  },
  inquiry: {
    count: async () => { counted++; return 0; },
    create: async ({ data }: { data: Row }) => {
      created.inquiry.push(data);
      return { ...data, id: "inq-1" };
    },
  },
};

const stub = (path: string, exports: unknown) => {
  require.cache[path] = { id: path, filename: path, loaded: true, exports } as unknown as NodeModule;
};
stub(require.resolve("./prisma"), { prisma: fakePrisma });
stub(require.resolve("./notify-admin"), { notifyAdmin: async (msg: unknown) => { emails.push(msg); } });
stub(require.resolve("./require-admin"), { requireAdminSession: async () => null });
process.env.APPS_SCRIPT_FORM_URL = "https://apps-script.test/exec";
globalThis.fetch = (async (_url: string, init: { body: string }) => {
  forwarded.push(JSON.parse(init.body));
  return new Response("ok");
}) as unknown as typeof fetch;

type Handler = (req: NextRequest) => Promise<Response>;
const { POST: submitConsult } = require("../app/api/submit-form/route") as { POST: Handler };
const { POST: submitInquiry } = require("../app/api/inquiries/route") as { POST: Handler };

const post = (handler: Handler, path: string, body: Row) =>
  handler(new NextRequest(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body) }));

const consult: Row = {
  fullName: "TEST Consent", dobMonth: "1", dobDay: "15", dobYear: "1990", gender: "Male",
  phone: "09170000000", email: "test@example.com", mtc: "No", pancreatitis: "No", gallbladder: "No",
  gi: "No", diabetes: "No", pregnant: "N/A", consent1: true, consent2: true, consent3: true,
};
const inquiry: Row = { name: "TEST Consent", contactInfo: "09170000000", message: "Hello" };

// Everything a client might send instead of a real `true`.
const NOT_CONSENT = [undefined, false, "true", "on", 1, "yes", {}];

beforeEach(() => {
  created = { consult: [], inquiry: [] };
  counted = 0;
  emails = [];
  forwarded = [];
  console.error = () => {};
  console.log = () => {};
});

// ---- POST /api/submit-form (book consult, health data) ----

test("consult: refuses anything but privacyConsent === true with 400 and its { success, error } shape (AC-7)", async () => {
  for (const privacyConsent of NOT_CONSENT) {
    const res = await post(submitConsult, "/api/submit-form", { ...consult, privacyConsent });
    assert.equal(res.status, 400, JSON.stringify(privacyConsent));
    assert.deepEqual(await res.json(), { success: false, error: CONSENT_REQUIRED_MESSAGE });
  }
});

test("consult: a refused submission saves nothing, emails nobody and forwards nothing to the Apps Script (AC-7)", async () => {
  await post(submitConsult, "/api/submit-form", { ...consult, privacyConsent: "true" });
  assert.deepEqual(created.consult, []);
  assert.deepEqual(emails, []);
  assert.deepEqual(forwarded, []);
  assert.equal(counted, 0, "the consent check runs before the rate limit query");
});

test("consult: the other field checks still come first, so a bad date of birth reports that (AC-7)", async () => {
  const res = await post(submitConsult, "/api/submit-form", { ...consult, dobMonth: "13" });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "Invalid date of birth");
});

test("consult: with consent, the saved row gets the server's privacy version and time (AC-8)", async () => {
  const before = Date.now();
  const res = await post(submitConsult, "/api/submit-form", { ...consult, privacyConsent: true });
  const after = Date.now();

  assert.equal(res.status, 200);
  assert.equal((await res.json()).success, true);
  const [row] = created.consult;
  assert.equal(row.privacyVersion, PRIVACY_VERSION);
  assert.ok(row.consentedAt instanceof Date);
  const at = (row.consentedAt as Date).getTime();
  assert.ok(at >= before && at <= after, "consentedAt is the server time of the request");
  assert.equal(emails.length, 1);
});

test("consult: a version or time sent by the client is ignored (AC-8)", async () => {
  await post(submitConsult, "/api/submit-form", {
    ...consult, privacyConsent: true, privacyVersion: "1999-01-01", consentedAt: "1999-01-01T00:00:00Z",
  });
  const [row] = created.consult;
  assert.equal(row.privacyVersion, PRIVACY_VERSION);
  assert.notEqual((row.consentedAt as Date).getFullYear(), 1999);
});

test("consult: privacyConsent and client consent fields are not forwarded to the Apps Script sheet", async () => {
  await post(submitConsult, "/api/submit-form", { ...consult, privacyConsent: true, privacyVersion: "1999-01-01" });
  assert.equal(forwarded.length, 1);
  assert.equal("privacyConsent" in forwarded[0], false);
  assert.equal("privacyVersion" in forwarded[0], false);
  assert.equal(forwarded[0].fullName, "TEST Consent");
});

// ---- POST /api/inquiries (contact form) ----

test("inquiry: refuses anything but privacyConsent === true with 400 and its { error } shape (AC-7)", async () => {
  for (const privacyConsent of NOT_CONSENT) {
    const res = await post(submitInquiry, "/api/inquiries", { ...inquiry, privacyConsent });
    assert.equal(res.status, 400, JSON.stringify(privacyConsent));
    assert.deepEqual(await res.json(), { error: CONSENT_REQUIRED_MESSAGE });
  }
});

test("inquiry: a refused submission saves nothing and emails nobody (AC-7)", async () => {
  await post(submitInquiry, "/api/inquiries", { ...inquiry, privacyConsent: false });
  assert.deepEqual(created.inquiry, []);
  assert.deepEqual(emails, []);
  assert.equal(counted, 0);
});

test("inquiry: missing required fields still report that first (AC-7)", async () => {
  const res = await post(submitInquiry, "/api/inquiries", { name: "TEST Consent", privacyConsent: true });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "name, contactInfo, and message are required");
});

test("inquiry: with consent, the saved row gets the server's version and time, ignoring client values (AC-8)", async () => {
  const before = Date.now();
  const res = await post(submitInquiry, "/api/inquiries", {
    ...inquiry, privacyConsent: true, privacyVersion: "1999-01-01", consentedAt: "1999-01-01T00:00:00Z",
  });
  const after = Date.now();

  assert.equal(res.status, 201);
  const [row] = created.inquiry;
  assert.equal(row.privacyVersion, PRIVACY_VERSION);
  const at = (row.consentedAt as Date).getTime();
  assert.ok(at >= before && at <= after);
  assert.equal(emails.length, 1);
});
