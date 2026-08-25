"use client";

import { useEffect, useState } from "react";
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

function RadioGroup({ field, label, required, value, onChange }: {
  field: string;
  label: string;
  required?: boolean;
  value: string;
  onChange: (opt: string) => void;
}) {
  return (
    <div>
      <label style={labelStyle}>{label} {required && "*"}</label>
      <div className="flex gap-6 mt-2">
        {["Yes", "No"].map((opt) => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer text-[13px]" style={{ color: "var(--ink-muted)" }}>
            <input type="radio" name={field} value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              style={{ accentColor: "var(--teal)" }}
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function BookPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [modalDismissed, setModalDismissed] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const modalOpen = (status === "loading" || status === "success" || status === "error") && !modalDismissed;

  useEffect(() => {
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modalOpen]);
  const [heightUnit, setHeightUnit] = useState<"cm" | "ftIn">("ftIn");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [isEditingHeight, setIsEditingHeight] = useState(false);
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [weightLbs, setWeightLbs] = useState("");

  
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
    waistCircumference: "",
    smokingStatus: "",
    drinkingFrequency: "",
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

  const getBMICategory = (bmi: number): { label: string; color: string } => {
    if (bmi < 18.5) return { label: "Underweight", color: "#3B82F6" };
    if (bmi < 23) return { label: "Normal", color: "#22C55E" };
    if (bmi < 25) return { label: "Overweight", color: "#F59E0B" };
    if (bmi < 30) return { label: "Obese Class I", color: "#F97316" };
    return { label: "Obese Class II", color: "#EF4444" };
  };

  const heightMerged = heightUnit === "ftIn" && heightFeet !== "" && heightInches !== "" && !isEditingHeight;

  const heightInCm = heightUnit === "ftIn"
    ? (parseFloat(heightFeet || "0") * 30.48) + (parseFloat(heightInches || "0") * 2.54)
    : parseFloat(form.height || "0");

  const convertedHeightCm = heightUnit === "ftIn"
    ? Math.round(heightInCm).toString()
    : form.height;

  const convertedWeightKg = weightUnit === "lbs"
    ? (parseFloat(weightLbs || "0") * 0.453592).toFixed(1)
    : form.weight;

  const bmiValue = heightInCm > 0 && parseFloat(convertedWeightKg) > 0
    ? parseFloat((parseFloat(convertedWeightKg) / Math.pow(heightInCm / 100, 2)).toFixed(1))
    : null;

  const bmiCategory = bmiValue ? getBMICategory(bmiValue) : null;

  // const convertedHeightCm = heightUnit === "ftIn"
  //   ? Math.round((parseFloat(heightFeet || "0") * 30.48) + (parseFloat(heightInches || "0") * 2.54)).toString()
  //   : form.height;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setModalDismissed(false);
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      const res = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          height: convertedHeightCm,
          weight: convertedWeightKg,
          bmi: bmiValue?.toString() ?? "",
          bmiCategory: bmiCategory?.label ?? "",
          pregnant: form.gender === "Female" ? form.pregnant : "N/A",
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMessage(json.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setReferenceNumber(json.referenceNumber ?? null);
      setStatus("success");
    } catch {
      setErrorMessage("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  };

  return (
    <div className="xl:[zoom:1.1]">
      <Navbar />

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-busy={status === "loading"}
          className="fixed inset-0 z-[999] flex items-center justify-center p-6"
          style={{ background: "rgba(15,74,60,0.75)", backdropFilter: "blur(3px)" }}
        >
          <div
            className="flex flex-col items-center gap-4 text-center rounded-[14px]"
            style={{ background: "#ffffff", padding: "3rem 2.5rem", width: 380, maxWidth: "100%" }}
          >
            {status === "loading" ? (
              <>
                <div
                  className="rounded-full animate-spin"
                  style={{ width: 48, height: 48, border: "3px solid var(--teal-pale)", borderTopColor: "var(--teal)" }}
                />
                <div className="font-display font-light text-[22px]" style={{ color: "var(--ink)" }}>
                  Submitting your form
                </div>
                <p className="text-[14px]" style={{ color: "var(--ink-muted)" }}>
                  Hang tight, this only takes a moment.
                </p>
              </>
            ) : status === "error" ? (
              <>
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{ width: 52, height: 52, background: "#FFEBEE" }}
                >
                  <span style={{ fontSize: 24 }}>⚠️</span>
                </div>
                <div className="font-display font-light text-[22px]" style={{ color: "var(--ink)" }}>
                  Submission failed
                </div>
                <p className="text-[14px]" style={{ color: "var(--ink-muted)" }}>
                  {errorMessage}
                </p>
                <button
                  type="button"
                  onClick={() => setModalDismissed(true)}
                  className="text-[12px] font-medium tracking-[0.08em] uppercase px-8 py-[12px] rounded-[3px] text-white"
                  style={{ background: "var(--teal)" }}
                >
                  Try again
                </button>
              </>
            ) : (
              <>
                <div
                  className="flex items-center justify-center rounded-full animate-modal-check-pop"
                  style={{ width: 52, height: 52, background: "var(--teal-pale)" }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 12l6 6L20 6"
                      stroke="var(--teal-dark)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="animate-modal-check-draw"
                    />
                  </svg>
                </div>
                <div className="font-display font-light text-[22px]" style={{ color: "var(--ink)" }}>
                  Submission confirmed
                </div>
                <p className="text-[14px]" style={{ color: "var(--ink-muted)" }}>
                  Our clinical team will review your information and reach out within 24 hours.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setModalDismissed(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="text-[12px] font-medium tracking-[0.08em] uppercase px-8 py-[12px] rounded-[3px] text-white"
                  style={{ background: "var(--teal)" }}
                >
                  Continue
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <main>
        {/* Page header */}
        <div className="px-4 md:px-9 pt-36 md:pt-44 pb-20"
          style={{ background: "linear-gradient(135deg, var(--teal-deep) 0%, var(--teal) 100%)" }}>
          <div className="mx-auto" style={{ maxWidth: 1360 }}>
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
              This form is exclusively for patients interested in our <strong style={{ color: "rgba(255,255,255,0.9)" }}>Tirzepatide Weight Management Program</strong>. Complete your medical history so our clinical team can design the right program for you.
            </p>
          </div>
        </div>

        {/* Form + Sidebar */}
        <div className="px-4 md:px-9 py-16"
          style={{ background: "linear-gradient(180deg, var(--cream) 0%, var(--cream) calc(100% - 180px), #eaf8f2 calc(100% - 60px), #cdf2e2 100%)" }}>
          <div className="mx-auto grid grid-cols-1 md:grid-cols-3 gap-12" style={{ maxWidth: 1360 }}>

          {/* Form */}
          <div className="md:col-span-2">
            {status === "success" ? (
              <div className="flex flex-col rounded-[6px] overflow-hidden"
                style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)" }}>
                {/* Top accent bar */}
                <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, var(--teal-deep), var(--teal-light))" }} />

                <div className="flex flex-col gap-6 p-10 md:p-14">
                  <div>
                    <h2 className="font-display font-light text-[26px] leading-[1.1]" style={{ color: "var(--ink)" }}>
                      Your consult request
                    </h2>
                    {referenceNumber && (
                      <div className="text-[12px] font-mono mt-1" style={{ color: "var(--ink-faint)" }}>
                        REF #{referenceNumber}
                      </div>
                    )}
                  </div>

                  {/* Receipt timeline */}
                  <div className="flex flex-col">
                    {[
                      { label: "Submitted", sub: "Just now", state: "done" as const },
                      { label: "Clinical review", sub: "Within 24 hours", state: "next" as const },
                      { label: "We contact you", sub: "Via phone or email", state: "pending" as const },
                      { label: "Program designed", sub: "Tailored to your history", state: "pending" as const },
                    ].map((step, i, arr) => (
                      <div key={step.label} className="flex gap-4 relative pb-6">
                        {i < arr.length - 1 && (
                          <span className="absolute left-[11px] top-[26px] bottom-0 w-px"
                            style={{ background: "rgba(0,0,0,0.08)" }} />
                        )}
                        <div
                          className="flex-shrink-0 flex items-center justify-center rounded-full text-[10px] font-bold z-10"
                          style={{
                            width: 24, height: 24,
                            background: step.state === "done" ? "var(--teal)" : "#ffffff",
                            color: step.state === "done" ? "#ffffff" : step.state === "next" ? "var(--teal)" : "var(--ink-faint)",
                            border: step.state === "next" ? "2px solid var(--teal)" : step.state === "pending" ? "1px solid rgba(0,0,0,0.12)" : "none",
                          }}
                        >
                          {step.state === "done" ? "✓" : i + 1}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium" style={{ color: "var(--ink)" }}>{step.label}</div>
                          <div className="text-[12px]" style={{ color: "var(--ink-faint)" }}>{step.sub}</div>
                        </div>
                      </div>
                    ))}
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
                  <div className="flex items-start gap-2 mt-3 p-3 rounded-[3px]"
                    style={{ background: "rgba(46,139,114,0.08)", border: "1px solid rgba(46,139,114,0.15)" }}>
                    <span style={{ fontSize: 14 }}>💉</span>
                    <p className="text-[11px] leading-[1.6]" style={{ color: "var(--teal-dark)" }}>
                      This form is for patients seeking our <strong>Tirzepatide Weight Management Program</strong> only. For other inquiries, please visit our <a href="/contact" style={{ textDecoration: "underline" }}>Contact page</a>.
                    </p>
                  </div>
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
                        {["Female", "Male"].map((opt) => (
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
                          onChange={(e) => set("phone", e.target.value.replace(/[^0-9+]/g, ""))}
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                      <div>
                        {/* Height label + unit toggle */}
                        <div className="flex items-center justify-between mb-2">
                          <label style={{ ...labelStyle, marginBottom: 0 }}>Height *</label>
                          <div className="flex rounded-[3px] overflow-hidden"
                            style={{ border: "1px solid rgba(0,0,0,0.12)", fontSize: 10 }}>
                            {(["ft/in", "cm"] as const).map((unit) => (
                              <button key={unit} type="button"
                                onClick={() => setHeightUnit(unit === "ft/in" ? "ftIn" : "cm")}
                                className="px-3 py-1 transition-all duration-150"
                                style={{
                                  background: (unit === "ft/in" ? heightUnit === "ftIn" : heightUnit === "cm") ? "var(--teal)" : "#fff",
                                  color: (unit === "ft/in" ? heightUnit === "ftIn" : heightUnit === "cm") ? "#fff" : "var(--ink-muted)",
                                  fontWeight: 500,
                                  letterSpacing: "0.06em",
                                  cursor: "pointer",
                                  border: "none",
                                }}>
                                {unit}
                              </button>
                            ))}
                          </div>
                        </div>

                        {heightUnit === "cm" ? (
                          <input type="number" required value={form.height}
                            onChange={(e) => set("height", e.target.value)}
                            placeholder="e.g. 160" style={inputStyle}
                            onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
                        ) : heightMerged ? (
                          <div className="flex items-center justify-between"
                            style={{ ...inputStyle, background: "var(--teal-pale)", borderColor: "var(--teal)" }}>
                            <span style={{ fontWeight: 700, color: "var(--ink)" }}>
                              {heightFeet}&apos;{heightInches}&quot;
                            </span>
                            <button type="button" onClick={() => setIsEditingHeight(true)}
                              style={{
                                background: "none", border: "none", padding: 0,
                                color: "var(--teal-dark)", fontSize: 11, fontWeight: 600,
                                letterSpacing: "0.02em", cursor: "pointer",
                              }}>
                              ✎ Edit
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2"
                            onBlur={(e) => {
                              // Only merge once focus actually leaves both
                              // inputs — tabbing from ft to in is a focus
                              // change within this pair and must not merge
                              // mid-transition (the other field may still be
                              // empty at that exact instant).
                              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                              setIsEditingHeight(false);
                            }}>
                            <div className="flex-1">
                              <input type="number" required value={heightFeet}
                                onChange={(e) => setHeightFeet(e.target.value)}
                                placeholder="ft" style={inputStyle}
                                onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                                onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
                              <div className="text-[10px] mt-1 text-center" style={{ color: "var(--ink-faint)" }}>feet</div>
                            </div>
                            <div className="flex-1">
                              <input type="number" required value={heightInches}
                                onChange={(e) => setHeightInches(e.target.value)}
                                placeholder="in" min="0" max="11" style={inputStyle}
                                onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                                onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
                              <div className="text-[10px] mt-1 text-center" style={{ color: "var(--ink-faint)" }}>inches</div>
                            </div>
                          </div>
                        )}

                        {/* Show converted cm when using ft/in */}
                        {heightUnit === "ftIn" && heightFeet && (
                          <p className="text-[11px] mt-2" style={{ color: "var(--teal)" }}>
                            ≈ {convertedHeightCm} cm
                          </p>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label style={{ ...labelStyle, marginBottom: 0 }}>Current Weight *</label>
                          <div className="flex rounded-[3px] overflow-hidden"
                            style={{ border: "1px solid rgba(0,0,0,0.12)", fontSize: 10 }}>
                            {["kg", "lbs"].map((unit) => (
                              <button key={unit} type="button"
                                onClick={() => setWeightUnit(unit as "kg" | "lbs")}
                                className="px-3 py-1 transition-all duration-150"
                                style={{
                                  background: weightUnit === unit ? "var(--teal)" : "#fff",
                                  color: weightUnit === unit ? "#fff" : "var(--ink-muted)",
                                  fontWeight: 500,
                                  letterSpacing: "0.06em",
                                  cursor: "pointer",
                                  border: "none",
                                }}>
                                {unit}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="relative">
                          {weightUnit === "kg" ? (
                            <input type="number" required value={form.weight}
                              onChange={(e) => set("weight", e.target.value)}
                              placeholder="e.g. 65"
                              style={{ ...inputStyle, paddingRight: 48 }}
                              onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                              onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
                          ) : (
                            <input type="number" required value={weightLbs}
                              onChange={(e) => setWeightLbs(e.target.value)}
                              placeholder="e.g. 143"
                              style={{ ...inputStyle, paddingRight: 48 }}
                              onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                              onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
                          )}
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px]"
                            style={{ color: "var(--ink-faint)", pointerEvents: "none" }}>
                            {weightUnit}
                          </span>
                        </div>

                        {weightUnit === "lbs" && weightLbs && (
                          <p className="text-[11px] mt-2" style={{ color: "var(--teal)" }}>
                            ≈ {convertedWeightKg} kg
                          </p>
                        )}
                      </div>
                    </div>

                    {/* BMI Result */}
                    {bmiValue && bmiCategory && (
                      <div className="p-4 rounded-[4px]"
                        style={{ background: "var(--cream)", border: "1px solid rgba(0,0,0,0.07)" }}>
                        <div className="text-[10px] font-semibold tracking-[0.16em] uppercase mb-2"
                          style={{ color: "var(--ink-faint)" }}>
                          BMI Result (Auto-calculated)
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="font-display text-[36px]" style={{ color: "var(--ink)", lineHeight: 1 }}>
                            {bmiValue}
                          </div>
                          <div>
                            <div className="text-[13px] font-medium" style={{ color: bmiCategory.color }}>
                              {bmiCategory.label}
                            </div>
                            <div className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
                              Based on Asian BMI standards
                            </div>
                          </div>
                        </div>
                        {/* BMI bar */}
                        <div className="mt-3 rounded-full overflow-hidden" style={{ height: 6, background: "rgba(0,0,0,0.08)" }}>
                          <div className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min((bmiValue / 40) * 100, 100)}%`,
                              background: bmiCategory.color,
                            }} />
                        </div>
                        <div className="flex justify-between mt-1">
                          {["18.5", "23", "25", "30"].map((v) => (
                            <div key={v} className="text-[9px]" style={{ color: "var(--ink-faint)" }}>{v}</div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label style={labelStyle}>
                        Waist Circumference (in inches){" "}
                        <span style={{ fontSize: 10, fontWeight: 400, color: "var(--ink-faint)", letterSpacing: "0.04em", textTransform: "none" }}>
                          — Optional
                        </span>
                      </label>
                      <input type="number" value={form.waistCircumference}
                        onChange={(e) => set("waistCircumference", e.target.value)}
                        placeholder="e.g. 33 (optional)" style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
                      <p className="text-[11px] mt-2" style={{ color: "var(--ink-faint)" }}>
                        Optional — measure around your belly button level.
                      </p>
                    </div>
                    
                    <div>
                      <label style={labelStyle}>Smoking / Vaping Status *</label>
                      <div className="flex flex-wrap gap-5 mt-2">
                        {["Smoker", "Vaper", "Non-Smoker"].map((opt) => (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer text-[13px]"
                            style={{ color: "var(--ink-muted)" }}>
                            <input type="radio" name="smokingStatus" value={opt} required
                              checked={form.smokingStatus === opt}
                              onChange={() => set("smokingStatus", opt)}
                              style={{ accentColor: "var(--teal)" }} />
                            {opt}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Drinking Frequency *</label>
                      <div className="flex flex-wrap gap-5 mt-2">
                        {["Never", "Occasional", "More than once a week"].map((opt) => (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer text-[13px]"
                            style={{ color: "var(--ink-muted)" }}>
                            <input type="radio" name="drinkingFrequency" value={opt} required
                              checked={form.drinkingFrequency === opt}
                              onChange={() => set("drinkingFrequency", opt)}
                              style={{ accentColor: "var(--teal)" }} />
                            {opt}
                          </label>
                        ))}
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
                    <RadioGroup field="mtc" label="Do you or any family members have a history of Medullary Thyroid Carcinoma (MTC) or Multiple Endocrine Neoplasia Type 2 (MEN 2)?" required value={form.mtc} onChange={(opt) => set("mtc", opt)} />
                    <RadioGroup field="pancreatitis" label="Do you have a history of pancreatitis?" required value={form.pancreatitis} onChange={(opt) => set("pancreatitis", opt)} />
                    <RadioGroup field="gallbladder" label="Do you have a history of gallbladder disease? (Gallstone, Cholecystectomy)" required value={form.gallbladder} onChange={(opt) => set("gallbladder", opt)} />
                    <RadioGroup field="gi" label="Do you have a history of severe gastrointestinal disease?" required value={form.gi} onChange={(opt) => set("gi", opt)} />
                    <RadioGroup field="diabetes" label="Do you have type 2 diabetes?" required value={form.diabetes} onChange={(opt) => set("diabetes", opt)} />
                    {form.gender === "Female" && (
                      <div>
                        <label style={labelStyle}>Are you currently pregnant, breastfeeding, or planning to become pregnant? *</label>
                        <div className="flex flex-wrap gap-6 mt-2">
                          {["Pregnant", "Breastfeeding", "Currently trying to get pregnant", "No"].map((opt) => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer text-[13px]" style={{ color: "var(--ink-muted)" }}>
                              <input type="radio" name="pregnant" value={opt} required
                                checked={form.pregnant === opt}
                                onChange={() => set("pregnant", opt)}
                                style={{ accentColor: "var(--teal)" }}
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

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
                      { field: "consent2", text: "I understand this medication may have side effects such as nausea, constipation" },
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
            {status !== "success" && (
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
            )}

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
        </div>
      </main>
      <Footer />
    </div>
  );
}