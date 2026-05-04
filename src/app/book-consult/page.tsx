"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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

export default function BookPage() {
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

    try {
      const res = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        setStatus("error");
        return;
      }

      setStatus("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setStatus("error");
    }
  };

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
    <>
      <Navbar />
      <main>
        {/* Page header */}
        <div className="px-8 md:px-16 py-20"
          style={{ background: "linear-gradient(135deg, var(--teal-deep) 0%, var(--teal) 100%)" }}>
          <div className="flex items-center gap-3 text-[11px] font-medium tracking-[0.2em] uppercase mb-5"
            style={{ color: "rgba(255,255,255,0.6)" }}>
            <span className="block w-8 h-px" style={{ background: "rgba(255,255,255,0.4)" }} />
            Book a consultation
          </div>
          <h1 className="font-display font-light text-white leading-[1.1] mb-4"
            style={{ fontSize: "clamp(36px, 4vw, 56px)" }}>
            Start your wellness<br />
            <em className="italic" style={{ color: "rgba(255,255,255,0.75)" }}>journey today.</em>
          </h1>
          <p className="text-[14px] leading-[1.75] font-light max-w-[440px]"
            style={{ color: "rgba(255,255,255,0.65)" }}>
            Complete your Patient Medical History Form so our clinical team can design the right program for you.
          </p>
        </div>

        {/* Form + Sidebar */}
        <div className="px-8 md:px-16 py-16 grid grid-cols-1 md:grid-cols-3 gap-12"
          style={{ background: "var(--cream)" }}>

          {/* Form */}
          <div className="md:col-span-2">
            {status === "success" ? (
              <div className="flex flex-col rounded-[6px] overflow-hidden"
                style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)" }}>
                {/* Top accent bar */}
                <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, var(--teal-deep), var(--teal-light))" }} />
                
                <div className="flex flex-col gap-6 p-10 md:p-14">
                  {/* Icon + heading */}
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 flex items-center justify-center rounded-full"
                      style={{ width: 52, height: 52, background: "var(--teal-pale)", border: "1px solid rgba(46,139,114,0.2)" }}>
                      <span style={{ fontSize: 22 }}>✓</span>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium tracking-[0.18em] uppercase mb-1" style={{ color: "var(--teal)" }}>
                        Submission confirmed
                      </div>
                      <h2 className="font-display font-light text-[28px] leading-[1.1]" style={{ color: "var(--ink)" }}>
                        Your form has been received.
                      </h2>
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }} />

                  {/* Message */}
                  <p className="text-[14px] leading-[1.8]" style={{ color: "var(--ink-muted)", maxWidth: 480 }}>
                    Thank you for completing your Patient Medical History Form. Our licensed clinical team will review your information and reach out to you within <strong>24 hours</strong> via your provided contact details.
                  </p>

                  {/* What happens next */}
                  <div className="p-5 rounded-[4px]" style={{ background: "var(--cream)" }}>
                    <div className="text-[10px] font-semibold tracking-[0.16em] uppercase mb-3" style={{ color: "var(--teal)" }}>
                      What happens next
                    </div>
                    <ul className="flex flex-col gap-2">
                      {[
                        "Our clinical team reviews your medical history",
                        "We will contact you to discuss your personalized program",
                        "A tailored wellness plan will be designed for you",
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-[12px]" style={{ color: "var(--ink-muted)" }}>
                          <span style={{ color: "var(--teal)", marginTop: 1 }}>✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* PHI reminder */}
                  <div className="flex items-start gap-3 p-4 rounded-[4px]"
                    style={{ background: "var(--teal-pale)", border: "1px solid rgba(46,139,114,0.15)" }}>
                    <span>🔒</span>
                    <p className="text-[11px] leading-[1.7]" style={{ color: "var(--ink-muted)" }}>
                      Your submission is treated as <strong>Protected Health Information (PHI)</strong> — kept strictly confidential and accessible only to our licensed clinical team.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setStatus("idle");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-[12px] font-medium tracking-[0.08em] uppercase px-8 py-[13px] rounded-[3px] text-white self-start mt-2"
                    style={{ background: "var(--teal)" }}>
                    Submit another response
                  </button>
                </div>
              </div>
            ) : (
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
                    * Indicates required field. Please ensure all details are accurate.
                  </p>
                  <div className="flex items-start gap-3 p-4 rounded-[4px] mt-4"
                    style={{ background: "var(--teal-pale)", border: "1px solid rgba(46,139,114,0.15)" }}>
                    <span>🔒</span>
                    <p className="text-[11px] leading-[1.7]" style={{ color: "var(--ink-muted)" }}>
                      Your information is treated as <strong>Protected Health Information (PHI)</strong> and handled with strict confidentiality — accessible only to our licensed clinical team, never shared with third parties.
                    </p>
                  </div>
                </div>

                {/* Demographics */}
                <div className="pt-2 pb-1" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                  <div className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-4" style={{ color: "var(--teal)" }}>
                    Patient Demographics
                  </div>
                  <div className="flex flex-col gap-5">
                    <div>
                      <label style={labelStyle}>First and Last Name *</label>
                      <input type="text" required value={form.fullName}
                        onChange={(e) => set("fullName", e.target.value)}
                        placeholder="e.g. Maria Santos" style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
                    </div>

                    <div>
                      <label style={labelStyle}>Date of Birth *</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "Month", field: "dobMonth", placeholder: "MM" },
                          { label: "Day", field: "dobDay", placeholder: "DD" },
                          { label: "Year", field: "dobYear", placeholder: "YYYY" },
                        ].map(({ label, field, placeholder }) => (
                          <div key={field}>
                            <div className="text-[10px] mb-1" style={{ color: "var(--ink-faint)" }}>{label}</div>
                            <input type="number" required
                              value={(form as Record<string, string | boolean>)[field] as string}
                              onChange={(e) => set(field, e.target.value)}
                              placeholder={placeholder} style={inputStyle}
                              onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                              onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Gender *</label>
                      <div className="flex flex-wrap gap-5 mt-2">
                        {["Female", "Male", "Prefer not to say"].map((opt) => (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer text-[13px]"
                            style={{ color: "var(--ink-muted)" }}>
                            <input type="radio" name="gender" value={opt} required
                              checked={form.gender === opt}
                              onChange={() => set("gender", opt)}
                              style={{ accentColor: "var(--teal)" }} />
                            {opt}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label style={labelStyle}>Phone Number</label>
                        <input type="tel" value={form.phone}
                          onChange={(e) => set("phone", e.target.value)}
                          placeholder="e.g. 09171234567" style={inputStyle}
                          onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
                      </div>
                      <div>
                        <label style={labelStyle}>Email Address</label>
                        <input type="email" value={form.email}
                          onChange={(e) => set("email", e.target.value)}
                          placeholder="e.g. maria@email.com" style={inputStyle}
                          onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label style={labelStyle}>Height (in cm) *</label>
                        <input type="number" required value={form.height}
                          onChange={(e) => set("height", e.target.value)}
                          placeholder="e.g. 160" style={inputStyle}
                          onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
                      </div>
                      <div>
                        <label style={labelStyle}>Current Weight (in kg) *</label>
                        <input type="number" required value={form.weight}
                          onChange={(e) => set("weight", e.target.value)}
                          placeholder="e.g. 65" style={inputStyle}
                          onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Medical History */}
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
                      <textarea value={form.surgeries} onChange={(e) => set("surgeries", e.target.value)}
                        rows={3} placeholder="e.g. Appendectomy - 2018"
                        style={{ ...inputStyle, resize: "vertical" }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
                    </div>

                    <div>
                      <label style={labelStyle}>Please list all current medications</label>
                      <textarea value={form.medications} onChange={(e) => set("medications", e.target.value)}
                        rows={3} placeholder="e.g. Metformin 500mg daily"
                        style={{ ...inputStyle, resize: "vertical" }}
                        onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
                    </div>

                    <div>
                      <label style={labelStyle}>Any known allergies</label>
                      <input type="text" value={form.allergies}
                        onChange={(e) => set("allergies", e.target.value)}
                        placeholder="e.g. Penicillin, shellfish" style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
                    </div>
                  </div>
                </div>

                {/* Consent */}
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
                          style={{ marginTop: 2, accentColor: "var(--teal)" }} />
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

                <div className="flex items-start gap-3 p-4 rounded-[4px]"
                  style={{ background: "var(--teal-pale)", border: "1px solid rgba(46,139,114,0.15)" }}>
                  <span>🔒</span>
                  <p className="text-[11px] leading-[1.7]" style={{ color: "var(--ink-muted)" }}>
                    Your information is treated as <strong>Protected Health Information (PHI)</strong> and handled with strict confidentiality — accessible only to our licensed clinical team, never shared with third parties.
                  </p>
                </div>

                <button type="submit" disabled={status === "loading"}
                  className="text-[12px] font-medium tracking-[0.08em] uppercase px-8 py-[14px] rounded-[3px] text-white transition-all duration-200 self-start"
                  style={{ background: status === "loading" ? "var(--teal-light)" : "var(--teal)", cursor: status === "loading" ? "not-allowed" : "pointer" }}>
                  {status === "loading" ? "Submitting..." : "Submit Form →"}
                </button>

                <p className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
                  Your information is kept strictly confidential and reviewed only by our clinical team.
                </p>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            <div className="p-6 rounded-[6px]" style={{ background: "var(--teal-deep)" }}>
              <div className="text-[11px] font-medium tracking-[0.14em] uppercase mb-4" style={{ color: "var(--teal-light)" }}>
                What happens next
              </div>
              <ul className="flex flex-col gap-3">
                {[
                  "Our clinical team reviews your form within 24 hours",
                  "We will reach out via your provided contact info",
                  "A personalized program will be designed for you",
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

            <div className="p-5 rounded-[6px]"
              style={{ background: "var(--teal-pale)", border: "1px solid rgba(46,139,114,0.15)" }}>
              <div className="flex items-center gap-2 mb-3">
                <span>🔒</span>
                <div className="text-[11px] font-semibold tracking-[0.1em] uppercase" style={{ color: "var(--teal-dark)" }}>
                  Your Data is Protected
                </div>
              </div>
              <p className="text-[11px] leading-[1.7]" style={{ color: "var(--ink-muted)" }}>
                All information submitted through this form is treated as <strong>Protected Health Information (PHI)</strong> and handled with strict confidentiality. Your data is securely stored and accessible only to our licensed clinical team — never shared with third parties.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}