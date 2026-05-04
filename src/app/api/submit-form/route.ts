import { NextRequest, NextResponse } from "next/server";

const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfG9v4F_HcDG-ilpXhsjR3myFdBgpvNGfk45DFeB2tMVxZnIg/formResponse";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const body = new URLSearchParams();
    body.append("fvv", "1");
    body.append("pageHistory", "0");
    body.append("entry.1151531400", data.fullName ?? "");
    body.append("entry.1106426692_year", data.dobYear ?? "");
    body.append("entry.1106426692_month", data.dobMonth ?? "");
    body.append("entry.1106426692_day", data.dobDay ?? "");
    body.append("entry.1567390701", data.gender ?? "");
    body.append("entry.2144155902", data.phone ?? "");
    body.append("entry.1444703762", data.email ?? "");
    body.append("entry.426170579", data.height ?? "");
    body.append("entry.29583508", data.weight ?? "");
    body.append("entry.1830349769", data.mtc ?? "");
    body.append("entry.1585373660", data.pancreatitis ?? "");
    body.append("entry.1407045507", data.gallbladder ?? "");
    body.append("entry.1126152943", data.gi ?? "");
    body.append("entry.893090830", data.diabetes ?? "");
    body.append("entry.1469985804", data.pregnant ?? "");
    body.append("entry.1633041313", data.surgeries ?? "");
    body.append("entry.1809182137", data.medications ?? "");
    body.append("entry.266846779", data.allergies ?? "");

    if (data.consent1) body.append("entry.882926976", "I acknowledge the importance of medical supervision during GLP-1 treatment");
    if (data.consent2) body.append("entry.882926976", "I understand this medication may have side effects such as nausea, constipation, or risk of thyroid tumors");
    if (data.consent3) body.append("entry.882926976", "I certify that the information provided above is accurate to the best of my knowledge.");

    const response = await fetch(GOOGLE_FORM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": "https://docs.google.com/forms/d/e/1FAIpQLSfG9v4F_HcDG-ilpXhsjR3myFdBgpvNGfk45DFeB2tMVxZnIg/viewform",
        "Origin": "https://docs.google.com",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: body.toString(),
      redirect: "follow",
    });

    console.log("Google response status:", response.status);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Form submission error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}