"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type InquiryType =
  | "GENERAL"
  | "PRODUCT_AVAILABILITY"
  | "PROGRAM_GUIDANCE"
  | "ORDER_INQUIRY";

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

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    contactInfo: "",
    message: "",
    type: "GENERAL" as InquiryType,
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

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

      if (!res.ok) {
        setErrorMsg(json.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("success");
      setForm({ name: "", contactInfo: "", message: "", type: "GENERAL" });
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  };

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

  return (
    <>
      <Navbar />
      <main>
        {/* Page header */}
        <div
          className="px-8 md:px-16 py-20"
          style={{
            background: "linear-gradient(135deg, var(--teal-deep) 0%, var(--teal) 100%)",
          }}
        >
          <div
            className="flex items-center gap-3 text-[11px] font-medium tracking-[0.2em] uppercase mb-5"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            <span className="block w-8 h-px" style={{ background: "rgba(255,255,255,0.4)" }} />
            Get in touch
          </div>
          <h1
            className="font-display font-light text-white leading-[1.1] mb-4"
            style={{ fontSize: "clamp(36px, 4vw, 56px)" }}
          >
            We&apos;d love to<br />
            <em className="italic" style={{ color: "rgba(255,255,255,0.75)" }}>
              hear from you.
            </em>
          </h1>
          <p
            className="text-[14px] leading-[1.75] font-light max-w-[440px]"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            Have questions about a product, program, or order? Fill out the form
            below or reach out directly through Facebook or phone.
          </p>
        </div>

        {/* Main content */}
        <div
          className="px-8 md:px-16 py-16 grid grid-cols-1 md:grid-cols-3 gap-12"
          style={{ background: "var(--cream)" }}
        >
          {/* Form — spans 2 cols */}
          <div className="md:col-span-2">
            {status === "success" ? (
              /* Success state */
              <div
                className="flex flex-col items-center justify-center gap-5 py-20 px-10 rounded-[6px] text-center"
                style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)" }}
              >
                <div className="text-[48px]">🎉</div>
                <h2
                  className="font-display font-light text-[32px]"
                  style={{ color: "var(--ink)" }}
                >
                  Inquiry received!
                </h2>
                <p
                  className="text-[14px] leading-[1.75] font-light max-w-[380px]"
                  style={{ color: "var(--ink-muted)" }}
                >
                  Thank you for reaching out. We will review your message and
                  contact you shortly through your provided contact info.
                </p>
                <button
                  onClick={() => setStatus("idle")}
                  className="text-[12px] font-medium tracking-[0.06em] uppercase px-8 py-[13px] rounded-[3px] text-white mt-2"
                  style={{ background: "var(--teal)" }}
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              /* Form */
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-6 p-8 rounded-[6px]"
                style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)" }}
              >
                <div>
                  <div
                    className="text-[11px] font-medium tracking-[0.18em] uppercase mb-1"
                    style={{ color: "var(--teal)" }}
                  >
                    Contact form
                  </div>
                  <h2
                    className="font-display font-light text-[28px]"
                    style={{ color: "var(--ink)" }}
                  >
                    Send us a message
                  </h2>
                </div>

                {/* Name */}
                <div>
                  <label style={labelStyle}>Your name *</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Maria Santos"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")}
                  />
                </div>

                {/* Contact info */}
                <div>
                  <label style={labelStyle}>Facebook name or phone number *</label>
                  <input
                    type="text"
                    name="contactInfo"
                    value={form.contactInfo}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Maria Santos or 09171234567"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")}
                  />
                  <p
                    className="text-[11px] mt-2"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    We&apos;ll use this to get back to you.
                  </p>
                </div>

                {/* Inquiry type */}
                <div>
                  <label style={labelStyle}>What is your inquiry about? *</label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    style={{ ...inputStyle, cursor: "pointer" }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")}
                  >
                    {INQUIRY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label style={labelStyle}>Message *</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="Tell us what you need — which product you're interested in, questions about a program, or anything else."
                    style={{ ...inputStyle, resize: "vertical" }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")}
                  />
                </div>

                {/* Error */}
                {status === "error" && (
                  <div
                    className="flex items-start gap-3 p-4 rounded-[4px]"
                    style={{ background: "#FFEBEE", border: "1px solid rgba(211,47,47,0.2)" }}
                  >
                    <span>⚠️</span>
                    <p className="text-[13px]" style={{ color: "#C62828" }}>
                      {errorMsg}
                    </p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="text-[12px] font-medium tracking-[0.08em] uppercase px-8 py-[14px] rounded-[3px] text-white transition-all duration-200 self-start"
                  style={{
                    background: status === "loading" ? "var(--teal-light)" : "var(--teal)",
                    cursor: status === "loading" ? "not-allowed" : "pointer",
                  }}
                >
                  {status === "loading" ? "Sending..." : "Send Inquiry →"}
                </button>

                <p className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
                  We typically respond within 24 hours on business days.
                </p>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            {/* Direct contact channels */}
            <div
              className="p-6 rounded-[6px]"
              style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <div
                className="text-[11px] font-medium tracking-[0.14em] uppercase mb-5"
                style={{ color: "var(--teal)" }}
              >
                Or contact us directly
              </div>
              <div className="flex flex-col gap-4">
                {CONTACT_CHANNELS.map((ch) => (
                  <a
                    key={ch.label}
                    href={ch.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-4 p-4 rounded-[4px] no-underline transition-colors duration-200"
                    style={{ background: "var(--cream)", border: "1px solid transparent" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--teal)";
                      e.currentTarget.style.background = "var(--teal-pale)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "transparent";
                      e.currentTarget.style.background = "var(--cream)";
                    }}
                  >
                    <span className="text-[24px]">{ch.icon}</span>
                    <div>
                      <div
                        className="text-[13px] font-medium mb-1"
                        style={{ color: "var(--ink)" }}
                      >
                        {ch.label}
                      </div>
                      <div
                        className="text-[12px] mb-1"
                        style={{ color: "var(--teal)" }}
                      >
                        {ch.value}
                      </div>
                      <div
                        className="text-[11px]"
                        style={{ color: "var(--ink-faint)" }}
                      >
                        {ch.desc}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Response time */}
            <div
              className="p-6 rounded-[6px]"
              style={{ background: "var(--teal-deep)" }}
            >
              <div
                className="text-[11px] font-medium tracking-[0.14em] uppercase mb-4"
                style={{ color: "var(--teal-light)" }}
              >
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
                    <span
                      className="text-[12px] font-light leading-[1.6]"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Disclaimer */}
            <div
              className="p-5 rounded-[6px]"
              style={{ background: "#FFF8E1", border: "1px solid rgba(245,127,23,0.2)" }}
            >
              <p className="text-[11px] leading-[1.7]" style={{ color: "#5D4037" }}>
                ⚠️ For medical emergencies, please contact your local healthcare
                provider or emergency services. VitalStats provides wellness
                consultations and is not a substitute for emergency medical care.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
