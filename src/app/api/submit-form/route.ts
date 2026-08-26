import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmin } from "@/lib/notify-admin";
import { formatReferenceNumber } from "@/lib/reference-number";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxi56o7zn0-HIygaDaXNgJ7cMB_bmznow78a78mEYhco6s3Jb0N66HB9OF8fKSGYnLr/exec";

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

    if (
      !Number.isInteger(dobMonth) || dobMonth < 1 || dobMonth > 12 ||
      !Number.isInteger(dobDay) || dobDay < 1 || dobDay > 31 ||
      !Number.isInteger(dobYear) || dobYear < 1900 || dobYear > currentYear
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid date of birth" },
        { status: 400 }
      );
    }

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0] ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await prisma.medicalHistory.count({
      where: { ipAddress, createdAt: { gte: oneHourAgo } },
    });

    if (recentCount >= 3) {
      return NextResponse.json(
        { success: false, error: "Too many submissions. Please try again later." },
        { status: 429 }
      );
    }

    // Save to DB
    const record = await prisma.medicalHistory.create({
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

    // Also send to Google Sheets
    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Referer": "https://docs.google.com/forms/d/e/1FAIpQLSfG9v4F_HcDG-ilpXhsjR3myFdBgpvNGfk45DFeB2tMVxZnIg/viewform",
          "Origin": "https://docs.google.com",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        body: JSON.stringify(data),
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
      });

      const responseText = await response.text();
      console.log("Apps Script response status:", response.status);
      console.log("Apps Script response body:", responseText);
    } catch (err) {
      console.error("[appsScriptForward]", err);
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