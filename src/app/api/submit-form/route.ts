import { NextRequest, NextResponse } from "next/server";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxi56o7zn0-HlygaDaXNgJ7cMB_bmznow78a78mEYhco6s3Jb0N66HB9OF8fKSGYnLr/exec";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      redirect: "follow",
    });

    console.log("Apps Script response status:", response.status);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Form submission error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}