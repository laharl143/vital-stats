"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type InquiryType = "GENERAL" | "PRODUCT_AVAILABILITY" | "PROGRAM_GUIDANCE" | "ORDER_INQUIRY";

const INQUIRY_TYPES: { value: InquiryType; label: string }[] = [
  { value: "GENERAL", label: "General inquiry" },
  { value: "PRODUCT_AVAILABILITY", label: "Product availability" },
  { value: "PROGRAM_GUIDANCE", label: "Program guidance" },
  { value: "ORDER_INQUIRY", label: "Order inquiry" },
];

const CONTACT_CHANNELS = [
  {
    icon: "📘",
    label: "Facebook",
    value: "facebook.com/vitalstatwellness",
    href: "https://facebook.com/vitalstatwellness",
    desc: "Message us directly — fastest response",
  },
  {
    icon: "📞",
    label: "Phone / Viber",
    value: "09278608705",
    href: "tel:09278608705",
    desc: "Call or Viber us anytime",
  },
];

const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfG9v4F_HcDG-ilpXhsjR3myFdBgpvNGfk45DFeB2tMVxZnIg/formResponse";

const inputStyle = {
  width: "100%",
  padding: "12px 16px",
  fontSize: 14,
  fontFamily: "inherit",
  border: "1px solid rgba(0,0,0,0.15)",
  borderRadius: 3,
  background: "#ffffff",
  color: "var(--ink)",
  outline: "none",
  transition: "border-color 0.2s",
};

const labelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "var(--ink-muted)",
  marginBottom: 8,
};

// ── Medical History Form ─────────────────────────────────────────────────────

function MedicalHistoryForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [form, setForm] = useState({
    fullName: "",
    dobYear: "",
    dobMonth: "",
    dobDay: "",
    gender: "",
    phone: "",
    email: "",
    height: "",
    weight: "",
    mtc: "",
    pancreatitis: "",
    gallbladder: "",
    gi: "",
    diabetes: "",
    pregnant: "",
    surgeries: "",
    medications: "",
    allergies: "",
    consent1: false,
    consent2: false,
    consent3: false,
  });

  const set = (field: string, value: string | boolean) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    const body = new URLSearchParams({
      "entry.1151531400": form.fullName,
      "entry.1106426692_year": form.dobYear,
      "entry.1106426692_month": form.dobMonth,
      "entry.1106426692_day": form.dobDay,
      "entry.1567390701": form.gender,
      "entry.2144155902": form.phone,
      "entry.1444703762": form.email,
      "entry.426170579": form.height,
      "entry.29583508": form.weight,
      "entry.1830349769": form.mtc,
      "entry.1585373660": form.pancreatitis,
      "entry.1407045507": form.gallbladder,
      "entry.1126152943": form.gi,
      "entry.893090830": form.diabetes,
      "entry.1469985804": form.pregnant,
      "entry.1633041313": form.surgeries,
      "entry.1809182137": form.medications,
      "entry.266846779": form.allergies,
    });

    if (form.consent1) body.append("entry.882926976", "I acknowledge the importance of medical supervision during GLP-1 treatment");
    if (form.consent2) body.append("entry.882926976", "I understand this medication may have side effects such as nausea, constipation, or risk of thyroid tumors");
    if (form.consent3) body.append("entry.882926976", "I certify that the information provided above is accurate to the best of my knowledge.");

    try {
      await fetch(GOOGLE_FORM_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-20 px-10 rounded-[6px] text-center"
        style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)" }}>
        <div className="text-[48px]">✅</div>
        <h2 className="font-display font-light text-[32px]" style={{ color: "var(--ink)" }}>
          Form submitted!
        </h2>
        <p className="text-[14px] leading-[1.75] font-light max-w-[380px]" style={{ color: "var(--ink-muted)" }}>
          Thank you for completing your Patient Medical History Form. Our clinical team will review your information and reach out to you shortly.
        </p>
        <button onClick={() => setStatus("idle")}
          className="text-[12px] font-medium tracking-[0.06em] uppercase px-8 py-[13px] rounded-[3px] text-white mt-2"
          style={{ background: "var(--teal)" }}>
          Submit another response
        </button>
      </div>
    );
  }

  const RadioGroup = ({ field, label, required }: { field: string; label: string; required?: boolean }) => (
    <div>
      <label style={labelStyle}>{label} {required && "*"}</label>
      <div className="flex gap-6 mt-2">
        {["Yes", "No"].map((opt) => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer text-[13px]" style={{ color: "var(--ink-muted)" }}>
            <input type="radio" name={field} value={opt}
              checked={(form as Record<string, string | boolean>)[field] === opt}
              onChange={() => set(field, opt)}
              style={{ accentColor: "var(--teal)" }}
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-8 rounded-[6px]"
      style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)" }}>
      <div>
        <div className="text-[11px] font-medium tracking-[0.18em] uppercase mb-1" style={{ color: "var(--teal)" }}>
          Patient Medical History
        </div>
        <h2 className="font-display font-light text-[28px]" style={{ color: "var(--ink)" }}>
          Medical History Form
        </h2>
        <p className="text-[12px] mt-2" style={{ color: "var(--ink-faint)" }}>
          * Indicates required field. Please ensure all details are accurate and up to date.
        </p>
      </div>

      {/* Section: Demographics */}
      <div className="pt-2 pb-1" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-4" style={{ color: "var(--teal)" }}>
          Patient Demographics
        </div>
        <div className="flex flex-col gap-5">
          {/* Full Name */}
          <div>
            <label style={labelStyle}>First and Last Name *</label>
            <input type="text" required value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              placeholder="e.g. Maria Santos"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")}
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label style={labelStyle}>Date of Birth *</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Month", field: "dobMonth", placeholder: "MM", max: 2 },
                { label: "Day", field: "dobDay", placeholder: "DD", max: 2 },
                { label: "Year", field: "dobYear", placeholder: "YYYY", max: 4 },
              ].map(({ label, field, placeholder, max }) => (
                <div key={field}>
                  <div className="text-[10px] mb-1" style={{ color: "var(--ink-faint)" }}>{label}</div>
                  <input type="number" required value={(form as Record<string, string | boolean>)[field] as string}
                    onChange={(e) => set(field, e.target.value)}
                    placeholder={placeholder}
                    maxLength={max}
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div>
            <label style={labelStyle}>Gender *</label>
            <div className="flex flex-wrap gap-5 mt-2">
              {["Female", "Male", "Prefer not to say"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer text-[13px]" style={{ color: "var(--ink-muted)" }}>
                  <input type="radio" name="gender" value={opt} required
                    checked={form.gender === opt}
                    onChange={() => set("gender", opt)}
                    style={{ accentColor: "var(--teal)" }}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input type="tel" value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="e.g. 09171234567"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")}
              />
            </div>
            <div>
              <label style={labelStyle}>Email Address</label>
              <input type="email" value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="e.g. maria@email.com"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")}
              />
            </div>
          </div>

          {/* Height & Weight */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Height (in cm) *</label>
              <input type="number" required value={form.height}
                onChange={(e) => set("height", e.target.value)}
                placeholder="e.g. 160"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")}
              />
            </div>
            <div>
              <label style={labelStyle}>Current Weight (in kg) *</label>
              <input type="number" required value={form.weight}
                onChange={(e) => set("weight", e.target.value)}
                placeholder="e.g. 65"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section: Medical History */}
      <div className="pt-2 pb-1" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-4" style={{ color: "var(--teal)" }}>
          Medical History
        </div>
        <div className="flex flex-col gap-5">
          <RadioGroup field="mtc" label="Do you or any family members have a history of Medullary Thyroid Carcinoma (MTC) or Multiple Endocrine Neoplasia Type 2 (MEN 2)?" required />
          <RadioGroup field="pancreatitis" label="Do you have a history of pancreatitis?" required />
          <RadioGroup field="gallbladder" label="Do you have a history of gallbladder disease? (Gallstone, Cholecystectomy)" required />
          <RadioGroup field="gi" label="Do you have a history of severe gastrointestinal disease?" required />
          <RadioGroup field="diabetes" label="Do you have type 2 diabetes?" required />
          <RadioGroup field="pregnant" label="Are you currently pregnant, breastfeeding, or planning to become pregnant?" required />

          <div>
            <label style={labelStyle}>Please list any major surgeries you&apos;ve had and their dates</label>
            <textarea value={form.surgeries}
              onChange={(e) => set("surgeries", e.target.value)}
              rows={3} placeholder="e.g. Appendectomy - 2018"
              style={{ ...inputStyle, resize: "vertical" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")}
            />
          </div>

          <div>
            <label style={labelStyle}>Please list all current medications (especially insulin or diabetic drugs)</label>
            <textarea value={form.medications}
              onChange={(e) => set("medications", e.target.value)}
              rows={3} placeholder="e.g. Metformin 500mg daily"
              style={{ ...inputStyle, resize: "vertical" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")}
            />
          </div>

          <div>
            <label style={labelStyle}>Any known allergies</label>
            <input type="text" value={form.allergies}
              onChange={(e) => set("allergies", e.target.value)}
              placeholder="e.g. Penicillin, shellfish"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")}
            />
          </div>
        </div>
      </div>

      {/* Section: Consent */}
      <div className="pt-2">
        <div className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-4" style={{ color: "var(--teal)" }}>
          Consent & Acknowledgement
        </div>
        <div className="flex flex-col gap-3">
          {[
            { field: "consent1", text: "I acknowledge the importance of medical supervision during GLP-1 treatment" },
            { field: "consent2", text: "I understand this medication may have side effects such as nausea, constipation, or risk of thyroid tumors" },
            { field: "consent3", text: "I certify that the information provided above is accurate to the best of my knowledge" },
          ].map(({ field, text }) => (
            <label key={field} className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox"
                checked={(form as Record<string, string | boolean>)[field] as boolean}
                onChange={(e) => set(field, e.target.checked)}
                style={{ marginTop: 2, accentColor: "var(--teal)" }}
              />
              <span className="text-[13px] leading-[1.6]" style={{ color: "var(--ink-muted)" }}>{text}</span>
            </label>
          ))}
        </div>
      </div>

      {status === "error" && (
        <div className="flex items-start gap-3 p-4 rounded-[4px]"
          style={{ background: "#FFEBEE", border: "1px solid rgba(211,47,47,0.2)" }}>
          <span>⚠️</span>
          <p className="text-[13px]" style={{ color: "#C62828" }}>Something went wrong. Please try again.</p>
        </div>
      )}

      <button type="submit" disabled={status === "loading"}
        className="text-[12px] font-medium tracking-[0.08em] uppercase px-8 py-[14px] rounded-[3px] text-white transition-all duration-200 self-start"
        style={{ background: status === "loading" ? "var(--teal-light)" : "var(--teal)", cursor: status === "loading" ? "not-allowed" : "pointer" }}>
        {status === "loading" ? "Submitting..." : "Submit Form →"}
      </button>

      <p className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
        Your information is kept strictly confidential and reviewed only by our clinical team.
      </p>
    </form>
  );
}

// ── Inquiry Form ─────────────────────────────────────────────────────────────

function InquiryForm() {
  const [form, setForm] = useState({ name: "", contactInfo: "", message: "", type: "GENERAL" as InquiryType });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { setErrorMsg(json.error ?? "Something went wrong."); setStatus("error"); return; }
      setStatus("success");
      setForm({ name: "", contactInfo: "", message: "", type: "GENERAL" });
    } catch {
      setErrorMsg("Network error. Please check your connection.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-20 px-10 rounded-[6px] text-center"
        style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)" }}>
        <div className="text-[48px]">🎉</div>
        <h2 className="font-display font-light text-[32px]" style={{ color: "var(--ink)" }}>Inquiry received!</h2>
        <p className="text-[14px] leading-[1.75] font-light max-w-[380px]" style={{ color: "var(--ink-muted)" }}>
          Thank you for reaching out. We will review your message and contact you shortly.
        </p>
        <button onClick={() => setStatus("idle")}
          className="text-[12px] font-medium tracking-[0.06em] uppercase px-8 py-[13px] rounded-[3px] text-white mt-2"
          style={{ background: "var(--teal)" }}>
          Send another inquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-8 rounded-[6px]"
      style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)" }}>
      <div>
        <div className="text-[11px] font-medium tracking-[0.18em] uppercase mb-1" style={{ color: "var(--teal)" }}>Contact form</div>
        <h2 className="font-display font-light text-[28px]" style={{ color: "var(--ink)" }}>Send us a message</h2>
      </div>
      <div>
        <label style={labelStyle}>Your name *</label>
        <input type="text" name="name" value={form.name} onChange={handleChange} required
          placeholder="e.g. Maria Santos" style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
      </div>
      <div>
        <label style={labelStyle}>Facebook name or phone number *</label>
        <input type="text" name="contactInfo" value={form.contactInfo} onChange={handleChange} required
          placeholder="e.g. Maria Santos or 09171234567" style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
        <p className="text-[11px] mt-2" style={{ color: "var(--ink-faint)" }}>We&apos;ll use this to get back to you.</p>
      </div>
      <div>
        <label style={labelStyle}>What is your inquiry about? *</label>
        <select name="type" value={form.type} onChange={handleChange}
          style={{ ...inputStyle, cursor: "pointer" }}
          onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")}>
          {INQUIRY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Message *</label>
        <textarea name="message" value={form.message} onChange={handleChange} required rows={5}
          placeholder="Tell us what you need — product, program, or anything else."
          style={{ ...inputStyle, resize: "vertical" }}
          onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
      </div>
      {status === "error" && (
        <div className="flex items-start gap-3 p-4 rounded-[4px]"
          style={{ background: "#FFEBEE", border: "1px solid rgba(211,47,47,0.2)" }}>
          <span>⚠️</span>
          <p className="text-[13px]" style={{ color: "#C62828" }}>{errorMsg}</p>
        </div>
      )}
      <button type="submit" disabled={status === "loading"}
        className="text-[12px] font-medium tracking-[0.08em] uppercase px-8 py-[14px] rounded-[3px] text-white transition-all duration-200 self-start"
        style={{ background: status === "loading" ? "var(--teal-light)" : "var(--teal)", cursor: status === "loading" ? "not-allowed" : "pointer" }}>
        {status === "loading" ? "Sending..." : "Send Inquiry →"}
      </button>
      <p className="text-[11px]" style={{ color: "var(--ink-faint)" }}>We typically respond within 24 hours on business days.</p>
    </form>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ContactPage() {
  const [activeTab, setActiveTab] = useState<"inquiry" | "medical">("inquiry");

  return (
    <>
      <Navbar />
      <main>
        {/* Page header */}
        <div className="px-8 md:px-16 py-20"
          style={{ background: "linear-gradient(135deg, var(--teal-deep) 0%, var(--teal) 100%)" }}>
          <div className="flex items-center gap-3 text-[11px] font-medium tracking-[0.2em] uppercase mb-5"
            style={{ color: "rgba(255,255,255,0.6)" }}>
            <span className="block w-8 h-px" style={{ background: "rgba(255,255,255,0.4)" }} />
            Get in touch
          </div>
          <h1 className="font-display font-light text-white leading-[1.1] mb-4"
            style={{ fontSize: "clamp(36px, 4vw, 56px)" }}>
            We&apos;d love to<br />
            <em className="italic" style={{ color: "rgba(255,255,255,0.75)" }}>hear from you.</em>
          </h1>
          <p className="text-[14px] leading-[1.75] font-light max-w-[440px]"
            style={{ color: "rgba(255,255,255,0.65)" }}>
            Have questions about a product or program? Fill out an inquiry or complete your patient medical history form.
          </p>
        </div>

        {/* Tabs */}
        <div className="px-8 md:px-16 pt-8" style={{ background: "var(--cream)" }}>
          <div className="flex gap-1 p-1 rounded-[6px] self-start inline-flex"
            style={{ background: "rgba(0,0,0,0.06)", width: "fit-content" }}>
            {[
              { key: "inquiry", label: "General Inquiry" },
              { key: "medical", label: "Patient Medical History" },
            ].map((tab) => (
              <button key={tab.key}
                onClick={() => setActiveTab(tab.key as "inquiry" | "medical")}
                className="text-[12px] font-medium tracking-[0.06em] uppercase px-5 py-2 rounded-[4px] transition-all duration-200"
                style={{
                  background: activeTab === tab.key ? "#ffffff" : "transparent",
                  color: activeTab === tab.key ? "var(--teal)" : "var(--ink-muted)",
                  boxShadow: activeTab === tab.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="px-8 md:px-16 py-10 grid grid-cols-1 md:grid-cols-3 gap-12"
          style={{ background: "var(--cream)" }}>
          {/* Form — spans 2 cols */}
          <div className="md:col-span-2">
            {activeTab === "inquiry" ? <InquiryForm /> : <MedicalHistoryForm />}
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            <div className="p-6 rounded-[6px]"
              style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)" }}>
              <div className="text-[11px] font-medium tracking-[0.14em] uppercase mb-5" style={{ color: "var(--teal)" }}>
                Or contact us directly
              </div>
              <div className="flex flex-col gap-4">
                {CONTACT_CHANNELS.map((ch) => (
                  <a key={ch.label} href={ch.href} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-4 p-4 rounded-[4px] no-underline transition-colors duration-200"
                    style={{ background: "var(--cream)", border: "1px solid transparent" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--teal)"; e.currentTarget.style.background = "var(--teal-pale)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "var(--cream)"; }}>
                    <span className="text-[24px]">{ch.icon}</span>
                    <div>
                      <div className="text-[13px] font-medium mb-1" style={{ color: "var(--ink)" }}>{ch.label}</div>
                      <div className="text-[12px] mb-1" style={{ color: "var(--teal)" }}>{ch.value}</div>
                      <div className="text-[11px]" style={{ color: "var(--ink-faint)" }}>{ch.desc}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-[6px]" style={{ background: "var(--teal-deep)" }}>
              <div className="text-[11px] font-medium tracking-[0.14em] uppercase mb-4" style={{ color: "var(--teal-light)" }}>
                What to expect
              </div>
              <ul className="flex flex-col gap-3">
                {[
                  "We respond within 24 hours on business days",
                  "Facebook messages get the fastest reply",
                  "Our clinical team reviews all program inquiries",
                  "All information is kept strictly confidential",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span style={{ color: "var(--teal-light)" }}>✓</span>
                    <span className="text-[12px] font-light leading-[1.6]" style={{ color: "rgba(255,255,255,0.7)" }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 rounded-[6px]"
              style={{ background: "#FFF8E1", border: "1px solid rgba(245,127,23,0.2)" }}>
              <p className="text-[11px] leading-[1.7]" style={{ color: "#5D4037" }}>
                ⚠️ For medical emergencies, please contact your local healthcare provider or emergency services. VitalStats provides wellness consultations and is not a substitute for emergency medical care.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}