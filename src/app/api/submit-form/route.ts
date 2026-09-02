import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmin } from "@/lib/notify-admin";
import { formatReferenceNumber } from "@/lib/reference-number";

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_FORM_URL;

const REQUIRED_FIELDS = [
  "fullName",
  "dobMonth",
  "dobDay",
  "dobYear",
  "gender",
  "phone",
  "email",
  "mtc",
  "pancreatitis",
  "gallbladder",
  "gi",
  "diabetes",
  "pregnant",
  "consent1",
  "consent2",
  "consent3",
] as const;

// Every field the app itself knows about, across REQUIRED_FIELDS and
// MAX_LENGTHS — the whitelist used to sanitize the copy forwarded to the
// external Apps Script so it can never carry more than the app validated.
const ALLOWED_FIELDS = new Set<string>(REQUIRED_FIELDS);

const MAX_LENGTHS: Record<string, number> = {
  fullName: 100,
  gender: 20,
  phone: 30,
  email: 200,
  height: 20,
  weight: 20,
  bmi: 20,
  bmiCategory: 20,
  waistCircumference: 20,
  smokingStatus: 50,
  drinkingFrequency: 50,
  mtc: 20,
  pancreatitis: 20,
  gallbladder: 20,
  gi: 20,
  diabetes: 20,
  pregnant: 20,
  surgeries: 2000,
  medications: 2000,
  allergies: 2000,
};

for (const field of Object.keys(MAX_LENGTHS)) {
  ALLOWED_FIELDS.add(field);
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    for (const field of REQUIRED_FIELDS) {
      if (!data[field]) {
        return NextResponse.json(
          { success: false, error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    for (const [field, maxLength] of Object.entries(MAX_LENGTHS)) {
      const value = data[field];
      if (typeof value === "string" && value.length > maxLength) {
        return NextResponse.json(
          { success: false, error: `${field} exceeds maximum allowed length` },
          { status: 400 }
        );
      }
    }

    const dobMonth = Number(data.dobMonth);
    const dobDay = Number(data.dobDay);
    const dobYear = Number(data.dobYear);
    const currentYear = new Date().getFullYear();

    // Day is checked against the real length of dobMonth/dobYear (e.g. 29 for
    // Feb 2000), not a flat 1-31 bound — otherwise calendar-impossible dates
    // like Feb 30 pass validation and get stored verbatim.
    const isValidCalendarDob =
      Number.isInteger(dobMonth) && dobMonth >= 1 && dobMonth <= 12 &&
      Number.isInteger(dobYear) && dobYear >= 1900 && dobYear <= currentYear &&
      Number.isInteger(dobDay) && dobDay >= 1 && dobDay <= new Date(dobYear, dobMonth, 0).getDate();

    if (!isValidCalendarDob) {
      return NextResponse.json(
        { success: false, error: "Invalid date of birth" },
        { status: 400 }
      );
    }

    // Only whitelisted, already-validated fields make it into this object —
    // used for the external forward below so that copy can never carry more
    // than what REQUIRED_FIELDS/MAX_LENGTHS already checked on `data`.
    const sanitizedData: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in data) sanitizedData[field] = data[field];
    }

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0] ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // The count-then-create rate-limit check races under concurrent
    // requests from the same IP (both read the same pre-insert count under
    // READ COMMITTED). A transaction-scoped advisory lock keyed on the IP
    // serializes concurrent requests from that IP so the count each one
    // sees reflects every prior request's insert — safe under pooled
    // connections since the lock is released when the transaction ends.
    const record = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('medicalHistory:' || ${ipAddress}, 0))`;

      const recentCount = await tx.medicalHistory.count({
        where: { ipAddress, createdAt: { gte: oneHourAgo } },
      });

      if (recentCount >= 3) {
        return null;
      }

      return tx.medicalHistory.create({
        data: {
          fullName: data.fullName ?? "",
          dateOfBirth: `${data.dobMonth}/${data.dobDay}/${data.dobYear}`,
          gender: data.gender ?? "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          height: data.height ?? "",
          weight: data.weight ?? "",
          bmi: data.bmi || null,
          bmiCategory: data.bmiCategory || null,
          waistCircumference: data.waistCircumference ?? "",
          smokingStatus: data.smokingStatus ?? "",
          drinkingFrequency: data.drinkingFrequency ?? "",
          mtc: data.mtc ?? "",
          pancreatitis: data.pancreatitis ?? "",
          gallbladder: data.gallbladder ?? "",
          gi: data.gi ?? "",
          diabetes: data.diabetes ?? "",
          pregnant: data.pregnant ?? "",
          surgeries: data.surgeries ?? "",
          medications: data.medications ?? "",
          allergies: data.allergies ?? "",
          consent1: data.consent1 ?? false,
          consent2: data.consent2 ?? false,
          consent3: data.consent3 ?? false,
          ipAddress,
        },
      });
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: "Too many submissions. Please try again later." },
        { status: 429 }
      );
    }

    try {
      await notifyAdmin({
        kind: "consult",
        fullName: record.fullName,
        email: record.email ?? "",
        phone: record.phone ?? "",
      });
    } catch (err) {
      console.error("[notifyAdmin]", err);
    }

    // Also send to Google Sheets — skipped entirely when unconfigured, and
    // forwards only sanitizedData (never the raw request body) so an
    // unvalidated/unbounded key can't reach the external sheet.
    if (APPS_SCRIPT_URL) {
      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Referer": "https://docs.google.com/forms/d/e/1FAIpQLSfG9v4F_HcDG-ilpXhsjR3myFdBgpvNGfk45DFeB2tMVxZnIg/viewform",
            "Origin": "https://docs.google.com",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          body: JSON.stringify(sanitizedData),
          redirect: "follow",
          signal: AbortSignal.timeout(5000),
        });

        const responseText = await response.text();
        console.log("Apps Script response status:", response.status);
        console.log("Apps Script response body:", responseText);
      } catch (err) {
        console.error("[appsScriptForward]", err);
      }
    }

    return NextResponse.json({
      success: true,
      referenceNumber: formatReferenceNumber(record.sequence, record.createdAt),
    });
  } catch (err) {
    console.error("Form submission error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}