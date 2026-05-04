import { NextRequest, NextResponse } from "next/server";

const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfG9v4F_HcDG-ilpXhsjR3myFdBgpvNGfk45DFeB2tMVxZnIg/formResponse";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const body = new URLSearchParams({
      "fvv": "1",
      "pageHistory": "0",
      "entry.1151531400": data.fullName ?? "",
      "entry.1106426692_year": data.dobYear ?? "",
      "entry.1106426692_month": data.dobMonth ?? "",
      "entry.1106426692_day": data.dobDay ?? "",
      "entry.1567390701": data.gender ?? "",
      "entry.2144155902": data.phone ?? "",
      "entry.1444703762": data.email ?? "",
      "entry.426170579": data.height ?? "",
      "entry.29583508": data.weight ?? "",
      "entry.1830349769": data.mtc ?? "",
      "entry.1585373660": data.pancreatitis ?? "",
      "entry.1407045507": data.gallbladder ?? "",
      "entry.1126152943": data.gi ?? "",
      "entry.893090830": data.diabetes ?? "",
      "entry.1469985804": data.pregnant ?? "",
      "entry.1633041313": data.surgeries ?? "",
      "entry.1809182137": data.medications ?? "",
      "entry.266846779": data.allergies ?? "",
    });

    if (data.consent1) body.append("entry.882926976", "I acknowledge the importance of medical supervision during GLP-1 treatment");
    if (data.consent2) body.append("entry.882926976", "I understand this medication may have side effects such as nausea, constipation, or risk of thyroid tumors");
    if (data.consent3) body.append("entry.882926976", "I certify that the information provided above is accurate to the best of my knowledge.");

    await fetch(GOOGLE_FORM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Form submission error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}