import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmin } from "@/lib/notify-admin";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxi56o7zn0-HIygaDaXNgJ7cMB_bmznow78a78mEYhco6s3Jb0N66HB9OF8fKSGYnLr/exec";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0] ??
      req.headers.get("x-real-ip") ??
      "unknown";

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
    });

    const responseText = await response.text();
    console.log("Apps Script response status:", response.status);
    console.log("Apps Script response body:", responseText);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Form submission error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}