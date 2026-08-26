"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Lowercases everything, then capitalizes the first letter of each word.
// Deterministic on every keystroke regardless of typing order, so it also
// normalizes text typed in ALL CAPS (a "preserve existing case" version
// breaks mid-word once caps-lock input has been partially normalized).
// Trade-off: an intentional internal capital ("McDonald", "O'Brien") gets
// flattened too, since there's no way to tell it apart from shouted input.
// Only changes letter case, never inserts/removes characters, so the cursor
// position stays put while typing.
const capitalizeWords = (value: string) => value.toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase());

// Snaps an out-of-range value back to the nearest bound on blur, rather
// than on every keystroke — clamping while typing would fight a leading 0
// (e.g. typing "09") since "0" alone is below a min of 1.
const clampToRange = (value: string, min: number, max: number) => {
  if (value === "") return value;
  const num = parseInt(value, 10);
  if (Number.isNaN(num)) return value;
  return String(Math.min(Math.max(num, min), max));
};

// Restores a PH mobile number's leading 0 if it's missing (e.g. "9171234567"
// typed or pasted without it, the most common way people write/copy their
// number). Runs on blur, not on every keystroke — prepending a character
// live while typing would shift the string length and could jump the
// cursor mid-edit.
const normalizePhPhone = (value: string) => {
  let digits = value.replace(/\D/g, "");
  if (digits.length > 0 && digits[0] !== "0") digits = "0" + digits;
  return digits.slice(0, 11);
};

// Formats a completed DOB as "January 5, 1996". Clamps the day to the real
// last day of the chosen month/year (e.g. day 31 typed for February) first
// — otherwise Date silently rolls invalid combinations into the next month,
// which reads as a plainly wrong date once shown as a written month name.
// Display-only: doesn't change the stored dobDay value.
const formatDob = (monthStr: string, dayStr: string, yearStr: string) => {
  const month = Number(monthStr);
  const year = Number(yearStr);
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const day = Math.min(Number(dayStr), lastDayOfMonth);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

// Simple shape check (local@domain.tld) — good enough to gate the
// confirmed-pill merge without rejecting anything a real mail server would
// accept; full deliverability isn't checkable client-side anyway.
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// Unqualified — the .com suffix is fixed in the UI, so only the domain
// word itself needs suggesting.
const EMAIL_DOMAIN_SUGGESTIONS = ["gmail", "yahoo", "outlook", "icloud"];

// Converts a cm value to its ft/in equivalent — used both to display the
// confirmed-pill conversion and to carry the value over when the user
// switches units mid-edit (e.g. 170 -> { feet: 5, inches: 7 }). Rounds to
// the nearest inch, then carries a rounded-up 12 into the next foot rather
// than returning 12 inches.
const cmToFtIn = (cm: number) => {
  const totalInches = cm / 2.54;
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches % 12);
  if (inches === 12) { feet += 1; inches = 0; }
  return { feet, inches };
};

// The resting (unfocused) border color for a text input — red once a
// submit attempt has flagged it as missing/incomplete, the same neutral
// gray as always otherwise. onFocus still overrides to teal; onBlur reverts
// to this so a field that's still invalid stays visibly flagged.
const restingBorderColor = (invalid: boolean) => (invalid ? "#DC2626" : "rgba(0,0,0,0.15)");

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

// A segmented pill group for categorical fields (2-4 named options). By
// default, below the `sm` breakpoint each option is its own independently-
// rounded chip — a shared capsule background looks fine as a single row but
// turns into a lopsided blob once options wrap to 2-3 rows on a narrow
// phone. At `sm` and up there's room for groups to stay on one row, so the
// original shared-capsule design with a sliding selection indicator takes
// over instead. Pass `capsuleOnMobile` to use that same capsule/indicator
// look at every width — only safe for a group that never wraps on mobile.
// Keeps a real (visually hidden) radio input per option for native keyboard
// nav and required-field validation — only the visuals change from circles
// to pills.
function PillGroup({ field, label, required, invalid, capsuleOnMobile, options, value, onChange }: {
  field: string;
  label: string;
  required?: boolean;
  invalid?: boolean;
  // Skips the mobile per-chip fallback — only safe for groups that never
  // wrap to a second row on a narrow phone (e.g. two short options like
  // Gender). A group that *can* wrap must keep the default, or it
  // reintroduces the lopsided-blob bug this component was built to avoid.
  capsuleOnMobile?: boolean;
  options: string[];
  value: string;
  onChange: (opt: string) => void;
}) {
  const optionRefs = useRef<Record<string, HTMLLabelElement | null>>({});
  const [indicator, setIndicator] = useState({ top: 0, left: 0, width: 0, height: 0 });

  // Measured (not index-based) so it works regardless of each option's text
  // width, and re-measured before paint on every selection change so the
  // indicator is never visible in the wrong spot for even a frame. Only
  // drives the sm+ sliding indicator — below sm each chip carries its own
  // background instead, so a stale measurement there is harmless.
  useLayoutEffect(() => {
    const el = optionRefs.current[value];
    if (el) setIndicator({ top: el.offsetTop, left: el.offsetLeft, width: el.offsetWidth, height: el.offsetHeight });
  }, [value, options]);

  return (
    <div>
      <label style={labelStyle}>{label} {required && <RequiredMark invalid={invalid} />}</label>
      <div className={`relative inline-flex flex-wrap gap-1.5 mt-2 ${capsuleOnMobile ? "bg-[var(--cream)] rounded-full p-1" : "sm:bg-[var(--cream)] sm:rounded-full sm:p-1"}`}
        style={{ boxShadow: invalid ? "0 0 0 1.5px #DC2626" : undefined }}>
        <span aria-hidden="true" className={capsuleOnMobile ? "block" : "hidden sm:block"} style={{
          position: "absolute",
          top: indicator.top, left: indicator.left, width: indicator.width, height: indicator.height,
          background: "var(--teal)", borderRadius: 999,
          transition: "top 0.22s cubic-bezier(0.4,0,0.2,1), left 0.22s cubic-bezier(0.4,0,0.2,1), width 0.22s cubic-bezier(0.4,0,0.2,1)",
        }} />
        {options.map((opt) => {
          const selected = value === opt;
          const textColor = selected ? "text-white" : "text-[var(--ink-muted)]";
          const chipBg = capsuleOnMobile ? "" : `sm:bg-transparent ${selected ? "bg-[var(--teal)]" : "bg-[var(--cream)]"}`;
          return (
            <label key={opt}
              ref={(el) => { optionRefs.current[opt] = el; }}
              className={`relative cursor-pointer text-[13px] font-medium transition-colors duration-150 ${textColor} ${chipBg}`}
              style={{ zIndex: 1, padding: "9px 18px", borderRadius: 999 }}>
              <input type="radio" name={field} value={opt} required={required}
                checked={selected}
                onChange={() => onChange(opt)}
                className="sr-only" />
              {opt}
            </label>
          );
        })}
      </div>
    </div>
  );
}

// The marker next to a required field's label — a plain "*" normally,
// swapping to a small red tag once a blocked submit has flagged this exact
// field. Defaults to "Required" (the only possible problem for most fields
// here — a name/number/choice is either present or it isn't); fields that
// can also be non-empty-but-wrong (Phone, Email) pass their own `text` so
// the tag says what actually happened instead of implying it's empty.
function RequiredMark({ invalid, text = "Required" }: { invalid?: boolean; text?: string }) {
  if (!invalid) return <span>*</span>;
  return (
    <span style={{
      display: "inline-flex", marginLeft: 6, fontSize: 9.5, fontWeight: 700,
      letterSpacing: "0.05em", textTransform: "uppercase", color: "#DC2626",
      background: "#FCE8E8", padding: "3px 8px", borderRadius: 5, verticalAlign: "middle",
    }}>
      {text}
    </span>
  );
}

// The blue counterpart to RequiredMark's red tag — a static "Optional" label
// for fields that never block submission, so it's visually obvious at a
// glance which fields are which without reading every label.
function OptionalMark() {
  return (
    <span style={{
      display: "inline-flex", marginLeft: 6, fontSize: 9.5, fontWeight: 700,
      letterSpacing: "0.05em", textTransform: "uppercase", color: "#2563EB",
      background: "#DBEAFE", padding: "3px 8px", borderRadius: 5, verticalAlign: "middle",
    }}>
      Optional
    </span>
  );
}

// A small switch for "I have none of these" next to a list-style optional
// field's label (Surgeries, Medications, Allergies). Turning it on doesn't
// clear whatever's already been entered — it just disables the field and
// forces the submitted value to "None", so flipping it back off restores
// exactly what was there before.
function NoneToggle({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label="None"
      onClick={() => onChange(!checked)}
      className="flex-shrink-0 flex items-center gap-2"
      style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
        color: checked ? "var(--teal-dark)" : "var(--ink-faint)",
      }}>
        None
      </span>
      <span style={{
        width: 30, height: 17, borderRadius: 999, display: "inline-block", position: "relative",
        background: checked ? "var(--teal)" : "#E1E6E4", transition: "background 0.15s",
      }}>
        <span style={{
          position: "absolute", top: 2, left: checked ? 15 : 2,
          width: 13, height: 13, borderRadius: "50%", background: "#fff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)", transition: "left 0.15s",
        }} />
      </span>
    </button>
  );
}

// A compact Yes/No toggle for the medical history questions. Unlike
// PillGroup this has no "unanswered" state and no required validation —
// per product decision, it always starts on "No" (see the form's initial
// state) rather than blocking submission until explicitly touched.
function Toggle({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (opt: string) => void;
}) {
  const isYes = value === "Yes";
  return (
    <div className="flex items-start justify-between gap-4">
      <label style={{ ...labelStyle, marginBottom: 0 }}>{label}</label>
      <button type="button" role="switch" aria-checked={isYes} aria-label={label}
        onClick={() => onChange(isYes ? "No" : "Yes")}
        className="flex-shrink-0 flex items-center gap-2"
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
          width: 26, textAlign: "right", color: isYes ? "var(--teal)" : "var(--ink-faint)",
        }}>
          {value}
        </span>
        <span style={{
          width: 44, height: 24, borderRadius: 999, display: "inline-block", position: "relative",
          background: isYes ? "var(--teal)" : "#E1E6E4", transition: "background 0.15s",
        }}>
          <span style={{
            position: "absolute", top: 2, left: isYes ? 22 : 2,
            width: 20, height: 20, borderRadius: "50%", background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition: "left 0.15s",
          }} />
        </span>
      </button>
    </div>
  );
}

export default function BookPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [modalDismissed, setModalDismissed] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  // Only true after a submit was blocked by a missing required field —
  // gates the red highlighting so nothing turns red before the user has
  // actually tried to submit.
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const modalOpen = (status === "loading" || status === "success" || status === "error") && !modalDismissed;

  useEffect(() => {
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modalOpen]);
  // Same "starts true" reasoning as isEditingDob below — wait for blur,
  // don't merge mid-keystroke the instant Last Name happens to be non-empty.
  const [isEditingName, setIsEditingName] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ftIn">("ftIn");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  // Starts true, same reasoning as isEditingDob below — wait for blur,
  // don't merge mid-keystroke the instant both parts (or the single cm
  // value) happen to be non-empty.
  const [isEditingHeight, setIsEditingHeight] = useState(true);
  // Starts true so the very first fill-out also waits for blur before
  // merging — otherwise dobMerged flips to true the instant all three
  // fields happen to be non-empty, mid-keystroke on Year.
  const [isEditingDob, setIsEditingDob] = useState(true);
  const dobDayRef = useRef<HTMLInputElement>(null);
  const dobYearRef = useRef<HTMLInputElement>(null);
  // Same "starts true" reasoning as isEditingDob — wait for blur, don't
  // merge mid-keystroke the instant the typed value happens to pass the
  // email shape check.
  const [isEditingEmail, setIsEditingEmail] = useState(true);
  const [emailLocal, setEmailLocal] = useState("");
  const [emailDomain, setEmailDomain] = useState("");
  const [domainFocused, setDomainFocused] = useState(false);
  const emailDomainRef = useRef<HTMLInputElement>(null);
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [weightLbs, setWeightLbs] = useState("");
  // Same "starts true" reasoning as isEditingHeight — wait for blur.
  const [isEditingWeight, setIsEditingWeight] = useState(true);

  // One ref per required field, in the order they appear on the page — used
  // to scroll to the first one still invalid after a blocked submit.
  const nameRef = useRef<HTMLDivElement>(null);
  const dobRef = useRef<HTMLDivElement>(null);
  const genderRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLDivElement>(null);
  const heightRef = useRef<HTMLDivElement>(null);
  const weightRef = useRef<HTMLDivElement>(null);
  const smokingRef = useRef<HTMLDivElement>(null);
  const drinkingRef = useRef<HTMLDivElement>(null);
  const pregnantRef = useRef<HTMLDivElement>(null);
  const consentRef = useRef<HTMLDivElement>(null);

  // Structured entry for Surgeries/Medications/Allergies — each serializes
  // down to the same flat string the API and admin view already expect
  // (see surgeriesValue/medicationsValue/allergiesValue below), so nothing
  // downstream needs to change to read this richer input.
  const [surgeries, setSurgeries] = useState([{ name: "", year: "" }]);
  const [medications, setMedications] = useState([{ name: "", dosage: "" }]);
  const [allergyChips, setAllergyChips] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState("");
  // Default to "None" — most patients have none of these, so this saves
  // the common case a tap instead of forcing everyone to opt out.
  const [noSurgeries, setNoSurgeries] = useState(true);
  const [noMedications, setNoMedications] = useState(true);
  const [noAllergies, setNoAllergies] = useState(true);


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
    mtc: "No",
    pancreatitis: "No",
    gallbladder: "No",
    gi: "No",
    diabetes: "No",
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

  const fullNameValue = firstName !== "" && lastName !== "" ? `${firstName} ${lastName}` : "";
  const nameMerged = fullNameValue !== "" && !isEditingName;

  const heightMerged = !isEditingHeight && (
    heightUnit === "ftIn" ? heightFeet !== "" && heightInches !== "" : form.height !== ""
  );

  const weightMerged = !isEditingWeight && (weightUnit === "kg" ? form.weight !== "" : weightLbs !== "");

  const dobMerged = form.dobMonth !== "" && form.dobDay !== "" && form.dobYear !== "" && !isEditingDob;

  const emailValue = emailLocal !== "" && emailDomain !== "" ? `${emailLocal}@${emailDomain}.com` : "";
  const emailMerged = isValidEmail(emailValue) && !isEditingEmail;

  const heightInCm = heightUnit === "ftIn"
    ? (parseFloat(heightFeet || "0") * 30.48) + (parseFloat(heightInches || "0") * 2.54)
    : parseFloat(form.height || "0");

  const convertedHeightCm = heightUnit === "ftIn"
    ? Math.round(heightInCm).toString()
    : form.height;

  // The equivalent shown inside the confirmed pill, in whichever unit
  // *wasn't* used to enter the value.
  const heightConversionLabel = heightUnit === "ftIn"
    ? `${convertedHeightCm} cm`
    : (() => { const { feet, inches } = cmToFtIn(parseFloat(form.height || "0")); return `${feet}'${inches}"`; })();

  const convertedWeightKg = weightUnit === "lbs"
    ? (parseFloat(weightLbs || "0") * 0.453592).toFixed(1)
    : form.weight;

  const weightConversionLabel = weightUnit === "kg"
    ? `${(parseFloat(form.weight || "0") * 2.20462).toFixed(1)} lbs`
    : `${convertedWeightKg} kg`;

  const bmiValue = heightInCm > 0 && parseFloat(convertedWeightKg) > 0
    ? parseFloat((parseFloat(convertedWeightKg) / Math.pow(heightInCm / 100, 2)).toFixed(1))
    : null;

  // Required-field checks, evaluated against the same values submit sends
  // (not the raw sub-fields) — e.g. Height is invalid based on whichever
  // unit is active, not both ft/in and cm at once. Only surfaced once a
  // submit has actually been attempted (see submitAttempted below), so
  // fields don't turn red before the user has done anything.
  const nameInvalid = fullNameValue === "";
  const dobInvalid = form.dobMonth === "" || form.dobDay === "" || form.dobYear === "";
  const genderInvalid = form.gender === "";
  const phoneInvalid = !/^09\d{9}$/.test(form.phone);
  const phoneRequiredText = form.phone === "" ? "Required" : "Invalid Number";
  const emailInvalid = !isValidEmail(emailValue);
  const emailRequiredText = emailLocal === "" && emailDomain === "" ? "Required" : "Incomplete";
  const heightInvalid = heightUnit === "ftIn" ? (heightFeet === "" || heightInches === "") : form.height === "";
  const weightInvalid = weightUnit === "kg" ? form.weight === "" : weightLbs === "";
  const smokingInvalid = form.smokingStatus === "";
  const drinkingInvalid = form.drinkingFrequency === "";
  const pregnantInvalid = form.gender === "Female" && form.pregnant === "";
  const consentInvalid = !(form.consent1 && form.consent2 && form.consent3);

  // Flattened for submission — same "name - year" / "name dosage" shape the
  // freeform textareas used to produce, so the API and admin view keep
  // working against a plain string without any changes on their end. The
  // "None" toggle overrides this rather than clearing the rows/chips, so
  // switching it back off restores whatever was already entered.
  const surgeriesValue = noSurgeries ? "None" : surgeries
    .filter((s) => s.name.trim() !== "")
    .map((s) => (s.year.trim() ? `${s.name.trim()} - ${s.year.trim()}` : s.name.trim()))
    .join("\n");
  const medicationsValue = noMedications ? "None" : medications
    .filter((m) => m.name.trim() !== "")
    .map((m) => (m.dosage.trim() ? `${m.name.trim()} ${m.dosage.trim()}` : m.name.trim()))
    .join("\n");
  const allergiesValue = noAllergies ? "None" : allergyChips.join(", ");

  const bmiCategory = bmiValue ? getBMICategory(bmiValue) : null;

  // const convertedHeightCm = heightUnit === "ftIn"
  //   ? Math.round((parseFloat(heightFeet || "0") * 30.48) + (parseFloat(heightInches || "0") * 2.54)).toString()
  //   : form.height;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Order matches the page, so the first entry still invalid is the
    // first one the user actually sees.
    const requiredFields: [boolean, React.RefObject<HTMLDivElement | null>][] = [
      [nameInvalid, nameRef],
      [dobInvalid, dobRef],
      [genderInvalid, genderRef],
      [phoneInvalid, phoneRef],
      [emailInvalid, emailRef],
      [heightInvalid, heightRef],
      [weightInvalid, weightRef],
      [smokingInvalid, smokingRef],
      [drinkingInvalid, drinkingRef],
      [pregnantInvalid, pregnantRef],
      [consentInvalid, consentRef],
    ];
    const firstInvalid = requiredFields.find(([invalid]) => invalid);
    if (firstInvalid) {
      setSubmitAttempted(true);
      firstInvalid[1].current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setStatus("loading");
    setModalDismissed(false);
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      const res = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          fullName: fullNameValue,
          email: emailValue,
          height: convertedHeightCm,
          weight: convertedWeightKg,
          bmi: bmiValue?.toString() ?? "",
          bmiCategory: bmiCategory?.label ?? "",
          pregnant: form.gender === "Female" ? form.pregnant : "N/A",
          surgeries: surgeriesValue,
          medications: medicationsValue,
          allergies: allergiesValue,
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
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 p-8 rounded-[6px]"
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
                    <div ref={nameRef}>
                      <label style={labelStyle}>Legal Name <RequiredMark invalid={submitAttempted && nameInvalid} /></label>
                      {nameMerged ? (
                        <div className="flex items-center justify-between"
                          style={{ ...inputStyle, background: "var(--teal-pale)", borderColor: "var(--teal)" }}>
                          <span style={{ fontWeight: 700, color: "var(--ink)" }}>{fullNameValue}</span>
                          <button type="button" onClick={() => setIsEditingName(true)}
                            style={{
                              background: "none", border: "none", padding: 0,
                              color: "var(--teal-dark)", fontSize: 11, fontWeight: 600,
                              letterSpacing: "0.02em", cursor: "pointer",
                            }}>
                            ✎ Edit
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-3"
                          onBlur={(e) => {
                            // Only re-merge once focus actually leaves both
                            // inputs — same reasoning as the Height/DOB
                            // groups below.
                            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                            if (firstName !== "" && lastName !== "") setIsEditingName(false);
                          }}>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] mb-1" style={{ color: "var(--ink-faint)" }}>First Name</div>
                            <input type="text" required value={firstName}
                              onChange={(e) => setFirstName(capitalizeWords(e.target.value.replace(/[0-9]/g, "")))}
                              style={{ ...inputStyle, borderColor: restingBorderColor(submitAttempted && nameInvalid) }}
                              onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
                              }}
                              onBlur={(e) => (e.target.style.borderColor = restingBorderColor(submitAttempted && nameInvalid))} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] mb-1" style={{ color: "var(--ink-faint)" }}>Last Name</div>
                            <input type="text" required value={lastName}
                              onChange={(e) => setLastName(capitalizeWords(e.target.value.replace(/[0-9]/g, "")))}
                              style={{ ...inputStyle, borderColor: restingBorderColor(submitAttempted && nameInvalid) }}
                              onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
                              }}
                              onBlur={(e) => (e.target.style.borderColor = restingBorderColor(submitAttempted && nameInvalid))} />
                          </div>
                        </div>
                      )}
                    </div>

                    <div ref={dobRef}>
                      <label style={labelStyle}>Date of Birth <RequiredMark invalid={submitAttempted && dobInvalid} /></label>
                      {dobMerged ? (
                        <div className="flex items-center justify-between"
                          style={{ ...inputStyle, background: "var(--teal-pale)", borderColor: "var(--teal)" }}>
                          <span style={{ fontWeight: 700, color: "var(--ink)" }}>
                            {formatDob(form.dobMonth, form.dobDay, form.dobYear)}
                          </span>
                          <button type="button" onClick={() => setIsEditingDob(true)}
                            style={{
                              background: "none", border: "none", padding: 0,
                              color: "var(--teal-dark)", fontSize: 11, fontWeight: 600,
                              letterSpacing: "0.02em", cursor: "pointer",
                            }}>
                            ✎ Edit
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3"
                          onBlur={(e) => {
                            // Only re-merge once focus actually leaves all
                            // three inputs — tabbing between them is a focus
                            // change within this group and must not merge
                            // mid-transition (another field may still be
                            // empty at that exact instant).
                            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                            setIsEditingDob(false);
                          }}>
                          {[
                            { label: "Month", field: "dobMonth", placeholder: "MM", min: 1, max: 12, digits: 2, ref: undefined, advanceTo: dobDayRef },
                            { label: "Day", field: "dobDay", placeholder: "DD", min: 1, max: 31, digits: 2, ref: dobDayRef, advanceTo: dobYearRef },
                            { label: "Year", field: "dobYear", placeholder: "YYYY", min: 1950, max: new Date().getFullYear(), digits: 4, ref: dobYearRef, advanceTo: null },
                          ].map(({ label, field, placeholder, min, max, digits, ref, advanceTo }) => (
                            <div key={field}>
                              <div className="text-[10px] mb-1" style={{ color: "var(--ink-faint)" }}>{label}</div>
                              <input type="number" required min={min} max={max} ref={ref}
                                value={(form as Record<string, string | boolean>)[field] as string}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const previous = (form as Record<string, string | boolean>)[field] as string;
                                  // Only hand off on the change that *completes*
                                  // the field (previous value was short, this one
                                  // isn't) — not on every change while it's
                                  // already at full length. Otherwise a spinner
                                  // click on an already-complete year (1995 ->
                                  // 1996 is still 4 digits) would re-trigger the
                                  // merge on every single click instead of
                                  // letting the user keep adjusting it.
                                  if (raw.length >= digits && previous.length < digits) {
                                    set(field, clampToRange(raw, min, max));
                                    if (advanceTo) advanceTo.current?.focus();
                                    else setIsEditingDob(false);
                                  } else {
                                    set(field, raw);
                                  }
                                }}
                                placeholder={placeholder}
                                style={{ ...inputStyle, borderColor: restingBorderColor(submitAttempted && dobInvalid) }}
                                onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                                onKeyDown={(e) => {
                                  // Enter should finalize this field (blur ->
                                  // clamp -> merge if complete), not submit the
                                  // whole Medical History form — these inputs
                                  // sit inside that <form>, and Enter in a text
                                  // input submits it by default.
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    e.currentTarget.blur();
                                  }
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = restingBorderColor(submitAttempted && dobInvalid);
                                  set(field, clampToRange(e.target.value, min, max));
                                }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div ref={genderRef}>
                      <PillGroup field="gender" label="Gender" required invalid={submitAttempted && genderInvalid} capsuleOnMobile
                        options={["Female", "Male"]} value={form.gender}
                        onChange={(opt) => set("gender", opt)} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div ref={phoneRef}>
                        <label style={labelStyle}>Phone Number <RequiredMark invalid={submitAttempted && phoneInvalid} text={phoneRequiredText} /></label>
                        <input type="tel" required value={form.phone} maxLength={11}
                          pattern="09[0-9]{9}" title="Philippine mobile number: 11 digits starting with 09, e.g. 09171234567"
                          onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 11))}
                          placeholder="e.g. 09171234567"
                          style={{ ...inputStyle, borderColor: restingBorderColor(submitAttempted && phoneInvalid) }}
                          onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                          onBlur={(e) => {
                            e.target.style.borderColor = restingBorderColor(submitAttempted && phoneInvalid);
                            set("phone", normalizePhPhone(e.target.value));
                          }} />
                      </div>
                      <div ref={emailRef}>
                        <label style={labelStyle}>Email Address <RequiredMark invalid={submitAttempted && emailInvalid} text={emailRequiredText} /></label>
                        {emailMerged ? (
                          <div className="flex items-center justify-between"
                            style={{ ...inputStyle, background: "var(--teal-pale)", borderColor: "var(--teal)" }}>
                            <span style={{ fontWeight: 700, color: "var(--ink)" }}>{emailValue}</span>
                            <button type="button" onClick={() => setIsEditingEmail(true)}
                              style={{
                                background: "none", border: "none", padding: 0,
                                color: "var(--teal-dark)", fontSize: 11, fontWeight: 600,
                                letterSpacing: "0.02em", cursor: "pointer",
                              }}>
                              ✎ Edit
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1"
                            onBlur={(e) => {
                              // Only re-merge once focus actually leaves the
                              // whole group (same reasoning as the DOB group
                              // below) — Local -> Domain via Tab must not
                              // merge mid-transition.
                              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                              if (isValidEmail(emailValue)) setIsEditingEmail(false);
                            }}>
                            <div className="flex-1 min-w-0">
                              <input type="text" required value={emailLocal}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  // Typing (or pasting) a full address into
                                  // this box still works — split it at the
                                  // @ and hand the rest to Domain instead of
                                  // requiring it be re-typed there.
                                  if (raw.includes("@")) {
                                    const [local, domainPart] = raw.split("@");
                                    setEmailLocal(local);
                                    if (domainPart) setEmailDomain(domainPart.replace(/\.com$/i, "").replace(/\.+$/, ""));
                                    emailDomainRef.current?.focus();
                                  } else {
                                    setEmailLocal(raw);
                                  }
                                }}
                                style={{ ...inputStyle, borderColor: restingBorderColor(submitAttempted && emailInvalid) }}
                                onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
                                }}
                                onBlur={(e) => (e.target.style.borderColor = restingBorderColor(submitAttempted && emailInvalid))} />
                            </div>
                            <div style={{ padding: "0 2px", fontWeight: 700, color: "var(--ink-faint)", fontSize: 14 }}>@</div>
                            <div className="flex-1 min-w-0 relative">
                              <input type="text" required ref={emailDomainRef} value={emailDomain}
                                // Only strips a fully-typed, redundant ".com"
                                // (the fixed suffix already shown after this
                                // box) — an internal or momentarily-trailing
                                // dot is otherwise left alone, so domains
                                // like "gmail.ph" (-> gmail.ph.com) can still
                                // be typed one character at a time.
                                onChange={(e) => setEmailDomain(e.target.value.replace(/\.com$/i, ""))}
                                placeholder="gmail"
                                style={{ ...inputStyle, borderColor: restingBorderColor(submitAttempted && emailInvalid) }}
                                onFocus={(e) => { e.target.style.borderColor = "var(--teal)"; setDomainFocused(true); }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
                                }}
                                onBlur={(e) => { e.target.style.borderColor = restingBorderColor(submitAttempted && emailInvalid); setDomainFocused(false); }} />
                              {domainFocused && (() => {
                                const matches = EMAIL_DOMAIN_SUGGESTIONS.filter((d) => d.startsWith(emailDomain.toLowerCase()));
                                if (matches.length === 0) return null;
                                return (
                                  <div className="flex flex-wrap gap-1.5 mt-2"
                                    style={{ position: "absolute", top: "100%", left: 0, zIndex: 20 }}>
                                    {matches.map((d) => (
                                      <button key={d} type="button"
                                        // Blocks the input from blurring on
                                        // click, so this dropdown is still
                                        // mounted when the click itself
                                        // fires — otherwise blur closes it
                                        // first and the click never lands.
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                          setEmailDomain(d);
                                          setDomainFocused(false);
                                          if (emailLocal !== "") setIsEditingEmail(false);
                                        }}
                                        style={{
                                          padding: "4px 10px", borderRadius: 999,
                                          background: "var(--cream)", border: "1px solid rgba(0,0,0,0.12)",
                                          color: "var(--ink-muted)", cursor: "pointer",
                                          fontSize: 11, fontWeight: 600,
                                        }}>
                                        {d}
                                      </button>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                            <div style={{ paddingLeft: 2, fontWeight: 600, color: "var(--ink-muted)", fontSize: 13, whiteSpace: "nowrap" }}>.com</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                      <div ref={heightRef}>
                        {/* Height label + unit toggle — hidden once confirmed */}
                        <div className="flex items-center justify-between mb-2">
                          <label style={{ ...labelStyle, marginBottom: 0 }}>Height <RequiredMark invalid={submitAttempted && heightInvalid} /></label>
                          {!heightMerged && (
                            <div className="flex rounded-[3px] overflow-hidden"
                              style={{ border: "1px solid rgba(0,0,0,0.12)", fontSize: 10 }}>
                              {(["ft/in", "cm"] as const).map((unit) => (
                                <button key={unit} type="button"
                                  onClick={() => {
                                    const nextUnit = unit === "ft/in" ? "ftIn" : "cm";
                                    if (nextUnit === heightUnit) return;
                                    // Carry the value across instead of
                                    // leaving the other unit's box empty —
                                    // the user may just be switching units
                                    // to double-check, not starting over.
                                    if (nextUnit === "cm" && heightFeet !== "" && heightInches !== "") {
                                      set("height", convertedHeightCm);
                                    } else if (nextUnit === "ftIn" && form.height !== "") {
                                      const { feet, inches } = cmToFtIn(parseFloat(form.height));
                                      setHeightFeet(String(feet));
                                      setHeightInches(String(inches));
                                    }
                                    setHeightUnit(nextUnit);
                                  }}
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
                          )}
                        </div>

                        {heightMerged ? (
                          <div className="flex items-center justify-between"
                            style={{ ...inputStyle, background: "var(--teal-pale)", borderColor: "var(--teal)" }}>
                            <span style={{ fontWeight: 700, color: "var(--ink)" }}>
                              {heightUnit === "ftIn" ? <>{heightFeet}&apos;{heightInches}&quot;</> : `${form.height} cm`}
                            </span>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span style={{
                                fontSize: 11, fontWeight: 600, color: "var(--teal-dark)",
                                background: "#fff", border: "1px solid rgba(46,139,114,0.35)",
                                padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap",
                              }}>
                                ≈ {heightConversionLabel}
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
                          </div>
                        ) : heightUnit === "cm" ? (
                          <div className="relative">
                            <input type="number" required value={form.height}
                              onChange={(e) => set("height", e.target.value)}
                              style={{ ...inputStyle, paddingRight: 48, borderColor: restingBorderColor(submitAttempted && heightInvalid) }}
                              onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                              onBlur={(e) => {
                                e.target.style.borderColor = restingBorderColor(submitAttempted && heightInvalid);
                                if (form.height !== "") setIsEditingHeight(false);
                              }} />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px]"
                              style={{ color: "var(--ink-faint)", pointerEvents: "none" }}>
                              cm
                            </span>
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
                              if (heightFeet !== "" && heightInches !== "") setIsEditingHeight(false);
                            }}>
                            <div className="flex-1">
                              <input type="number" required value={heightFeet}
                                onChange={(e) => setHeightFeet(e.target.value)}
                                placeholder="ft" style={{ ...inputStyle, borderColor: restingBorderColor(submitAttempted && heightInvalid) }}
                                onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                                onBlur={(e) => (e.target.style.borderColor = restingBorderColor(submitAttempted && heightInvalid))} />
                              <div className="text-[10px] mt-1 text-center" style={{ color: "var(--ink-faint)" }}>feet</div>
                            </div>
                            <div className="flex-1">
                              <input type="number" required value={heightInches}
                                onChange={(e) => setHeightInches(e.target.value)}
                                placeholder="in" min="0" max="11" style={{ ...inputStyle, borderColor: restingBorderColor(submitAttempted && heightInvalid) }}
                                onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                                onBlur={(e) => (e.target.style.borderColor = restingBorderColor(submitAttempted && heightInvalid))} />
                              <div className="text-[10px] mt-1 text-center" style={{ color: "var(--ink-faint)" }}>inches</div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div ref={weightRef}>
                        {/* Weight label + unit toggle — hidden once confirmed */}
                        <div className="flex items-center justify-between mb-2">
                          <label style={{ ...labelStyle, marginBottom: 0 }}>Current Weight <RequiredMark invalid={submitAttempted && weightInvalid} /></label>
                          {!weightMerged && (
                            <div className="flex rounded-[3px] overflow-hidden"
                              style={{ border: "1px solid rgba(0,0,0,0.12)", fontSize: 10 }}>
                              {["kg", "lbs"].map((unit) => (
                                <button key={unit} type="button"
                                  onClick={() => {
                                    const nextUnit = unit as "kg" | "lbs";
                                    if (nextUnit === weightUnit) return;
                                    // Carry the value across instead of
                                    // leaving the other unit's box empty.
                                    if (nextUnit === "lbs" && form.weight !== "") {
                                      setWeightLbs((parseFloat(form.weight) * 2.20462).toFixed(1));
                                    } else if (nextUnit === "kg" && weightLbs !== "") {
                                      set("weight", convertedWeightKg);
                                    }
                                    setWeightUnit(nextUnit);
                                  }}
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
                          )}
                        </div>

                        {weightMerged ? (
                          <div className="flex items-center justify-between"
                            style={{ ...inputStyle, background: "var(--teal-pale)", borderColor: "var(--teal)" }}>
                            <span style={{ fontWeight: 700, color: "var(--ink)" }}>
                              {weightUnit === "kg" ? form.weight : weightLbs} {weightUnit}
                            </span>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span style={{
                                fontSize: 11, fontWeight: 600, color: "var(--teal-dark)",
                                background: "#fff", border: "1px solid rgba(46,139,114,0.35)",
                                padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap",
                              }}>
                                ≈ {weightConversionLabel}
                              </span>
                              <button type="button" onClick={() => setIsEditingWeight(true)}
                                style={{
                                  background: "none", border: "none", padding: 0,
                                  color: "var(--teal-dark)", fontSize: 11, fontWeight: 600,
                                  letterSpacing: "0.02em", cursor: "pointer",
                                }}>
                                ✎ Edit
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            {weightUnit === "kg" ? (
                              <input type="number" required value={form.weight}
                                onChange={(e) => set("weight", e.target.value)}
                                style={{ ...inputStyle, paddingRight: 48, borderColor: restingBorderColor(submitAttempted && weightInvalid) }}
                                onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                                onBlur={(e) => {
                                  e.target.style.borderColor = restingBorderColor(submitAttempted && weightInvalid);
                                  if (form.weight !== "") setIsEditingWeight(false);
                                }} />
                            ) : (
                              <input type="number" required value={weightLbs}
                                onChange={(e) => setWeightLbs(e.target.value)}
                                style={{ ...inputStyle, paddingRight: 48, borderColor: restingBorderColor(submitAttempted && weightInvalid) }}
                                onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                                onBlur={(e) => {
                                  e.target.style.borderColor = restingBorderColor(submitAttempted && weightInvalid);
                                  if (weightLbs !== "") setIsEditingWeight(false);
                                }} />
                            )}
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px]"
                              style={{ color: "var(--ink-faint)", pointerEvents: "none" }}>
                              {weightUnit}
                            </span>
                          </div>
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
                      <label style={labelStyle}>Waist Circumference (in inches) <OptionalMark /></label>
                      <input type="number" value={form.waistCircumference}
                        onChange={(e) => set("waistCircumference", e.target.value)}
                        placeholder="e.g. 33 (optional)" style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
                      <p className="text-[11px] mt-2" style={{ color: "var(--ink-faint)" }}>
                        Optional — measure around your belly button level.
                      </p>
                    </div>
                    
                    <div ref={smokingRef}>
                      <PillGroup field="smokingStatus" label="Smoking / Vaping Status" required invalid={submitAttempted && smokingInvalid}
                        options={["Smoker", "Vaper", "Non-Smoker"]} value={form.smokingStatus}
                        onChange={(opt) => set("smokingStatus", opt)} />
                    </div>

                    <div ref={drinkingRef}>
                      <PillGroup field="drinkingFrequency" label="Drinking Frequency" required invalid={submitAttempted && drinkingInvalid}
                        options={["Never", "Occasional", "More than once a week"]} value={form.drinkingFrequency}
                        onChange={(opt) => set("drinkingFrequency", opt)} />
                    </div>

                    {form.gender === "Female" && (
                      <div ref={pregnantRef}>
                        <PillGroup field="pregnant" label="Are you currently pregnant, breastfeeding, or planning to become pregnant?" required invalid={submitAttempted && pregnantInvalid}
                          options={["Pregnant", "Breastfeeding", "Currently trying to get pregnant", "No"]} value={form.pregnant}
                          onChange={(opt) => set("pregnant", opt)} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Medical History */}
                <div className="pt-2 pb-1" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                  <div className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-4" style={{ color: "var(--teal)" }}>
                    Medical History
                  </div>
                  <div className="flex flex-col gap-5">
                    <Toggle label="Do you or any family members have a history of Medullary Thyroid Carcinoma (MTC) or Multiple Endocrine Neoplasia Type 2 (MEN 2)?" value={form.mtc} onChange={(opt) => set("mtc", opt)} />
                    <Toggle label="Do you have a history of pancreatitis?" value={form.pancreatitis} onChange={(opt) => set("pancreatitis", opt)} />
                    <Toggle label="Do you have a history of gallbladder disease? (Gallstone, Cholecystectomy)" value={form.gallbladder} onChange={(opt) => set("gallbladder", opt)} />
                    <Toggle label="Do you have a history of severe gastrointestinal disease?" value={form.gi} onChange={(opt) => set("gi", opt)} />
                    <Toggle label="Do you have type 2 diabetes?" value={form.diabetes} onChange={(opt) => set("diabetes", opt)} />

                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <label style={{ ...labelStyle, marginBottom: 0 }}>Major Surgeries</label>
                        <NoneToggle checked={noSurgeries} onChange={setNoSurgeries} />
                      </div>
                      {noSurgeries ? (
                        <div style={{ ...inputStyle, background: "var(--cream)", color: "var(--ink-faint)", fontStyle: "italic" }}>None</div>
                      ) : (
                        <>
                          <div className="flex flex-col gap-2">
                            {surgeries.map((row, i) => (
                              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 100px 24px", gap: 8, alignItems: "center" }}>
                                <input type="text" value={row.name}
                                  onChange={(e) => setSurgeries((prev) => prev.map((r, ri) => (ri === i ? { ...r, name: e.target.value } : r)))}
                                  placeholder="e.g. Appendectomy" style={inputStyle}
                                  onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                                  onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
                                <input type="text" inputMode="numeric" value={row.year}
                                  onChange={(e) => setSurgeries((prev) => prev.map((r, ri) => (ri === i ? { ...r, year: e.target.value.replace(/\D/g, "").slice(0, 4) } : r)))}
                                  placeholder="Year" style={inputStyle}
                                  onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                                  onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
                                <button type="button" aria-label="Remove"
                                  onClick={() => {
                                    // Removing the only remaining row means
                                    // "I have none of these" — flip the
                                    // toggle instead of leaving an empty row.
                                    if (surgeries.length === 1) setNoSurgeries(true);
                                    setSurgeries((prev) => {
                                      const next = prev.filter((_, ri) => ri !== i);
                                      return next.length > 0 ? next : [{ name: "", year: "" }];
                                    });
                                  }}
                                  style={{ background: "none", border: "none", color: "var(--ink-faint)", fontSize: 18, lineHeight: 1, cursor: "pointer", padding: 0 }}>
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                          {surgeries[surgeries.length - 1].name.trim() !== "" && (
                            <button type="button" onClick={() => setSurgeries((prev) => [...prev, { name: "", year: "" }])}
                              className="text-[12px] font-semibold mt-2"
                              style={{ background: "none", border: "none", color: "var(--teal-dark)", cursor: "pointer", padding: 0 }}>
                              + Add another
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <label style={{ ...labelStyle, marginBottom: 0 }}>Current Medications</label>
                        <NoneToggle checked={noMedications} onChange={setNoMedications} />
                      </div>
                      {noMedications ? (
                        <div style={{ ...inputStyle, background: "var(--cream)", color: "var(--ink-faint)", fontStyle: "italic" }}>None</div>
                      ) : (
                        <>
                          <div className="flex flex-col gap-2">
                            {medications.map((row, i) => (
                              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 140px 24px", gap: 8, alignItems: "center" }}>
                                <input type="text" value={row.name}
                                  onChange={(e) => setMedications((prev) => prev.map((r, ri) => (ri === i ? { ...r, name: e.target.value } : r)))}
                                  placeholder="e.g. Metformin" style={inputStyle}
                                  onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                                  onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
                                <input type="text" value={row.dosage}
                                  onChange={(e) => setMedications((prev) => prev.map((r, ri) => (ri === i ? { ...r, dosage: e.target.value } : r)))}
                                  placeholder="500mg daily" style={inputStyle}
                                  onFocus={(e) => (e.target.style.borderColor = "var(--teal)")}
                                  onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.15)")} />
                                <button type="button" aria-label="Remove"
                                  onClick={() => {
                                    // Removing the only remaining row means
                                    // "I have none of these" — flip the
                                    // toggle instead of leaving an empty row.
                                    if (medications.length === 1) setNoMedications(true);
                                    setMedications((prev) => {
                                      const next = prev.filter((_, ri) => ri !== i);
                                      return next.length > 0 ? next : [{ name: "", dosage: "" }];
                                    });
                                  }}
                                  style={{ background: "none", border: "none", color: "var(--ink-faint)", fontSize: 18, lineHeight: 1, cursor: "pointer", padding: 0 }}>
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                          {medications[medications.length - 1].name.trim() !== "" && (
                            <button type="button" onClick={() => setMedications((prev) => [...prev, { name: "", dosage: "" }])}
                              className="text-[12px] font-semibold mt-2"
                              style={{ background: "none", border: "none", color: "var(--teal-dark)", cursor: "pointer", padding: 0 }}>
                              + Add another
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <label style={{ ...labelStyle, marginBottom: 0 }}>Known Allergies</label>
                        <NoneToggle checked={noAllergies} onChange={setNoAllergies} />
                      </div>
                      {noAllergies ? (
                        <div style={{ ...inputStyle, background: "var(--cream)", color: "var(--ink-faint)", fontStyle: "italic" }}>None</div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5"
                          style={{ ...inputStyle, height: "auto", minHeight: 46, padding: 8 }}
                          onClick={(e) => {
                            if (e.target === e.currentTarget) (e.currentTarget.querySelector("input") as HTMLInputElement | null)?.focus();
                          }}>
                          {allergyChips.map((chip, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5 text-[12px] font-medium"
                              style={{ background: "var(--teal-pale)", color: "var(--teal-dark)", borderRadius: 999, padding: "5px 6px 5px 10px" }}>
                              {chip}
                              <button type="button" aria-label={`Remove ${chip}`}
                                onClick={() => setAllergyChips((prev) => prev.filter((_, ci) => ci !== i))}
                                style={{ background: "none", border: "none", color: "inherit", opacity: 0.7, fontSize: 13, lineHeight: 1, cursor: "pointer", padding: 0 }}>
                                ×
                              </button>
                            </span>
                          ))}
                          <input type="text" value={allergyInput}
                            onChange={(e) => setAllergyInput(e.target.value)}
                            onKeyDown={(e) => {
                              if ((e.key === "Enter" || e.key === ",") && allergyInput.trim()) {
                                e.preventDefault();
                                setAllergyChips((prev) => [...prev, allergyInput.trim()]);
                                setAllergyInput("");
                              } else if (e.key === "Backspace" && allergyInput === "" && allergyChips.length > 0) {
                                setAllergyChips((prev) => prev.slice(0, -1));
                              }
                            }}
                            onBlur={() => {
                              if (allergyInput.trim()) {
                                setAllergyChips((prev) => [...prev, allergyInput.trim()]);
                                setAllergyInput("");
                              }
                            }}
                            placeholder={allergyChips.length === 0 ? "e.g. Penicillin, shellfish" : "Add another…"}
                            style={{ border: "none", outline: "none", flex: 1, minWidth: 120, fontSize: 14, background: "transparent", color: "var(--ink)" }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Consent */}
                <div className="pt-2" ref={consentRef}>
                  <div className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-4" style={{ color: "var(--teal)" }}>
                    Consent & Acknowledgement <RequiredMark invalid={submitAttempted && consentInvalid} />
                  </div>
                  <div className="flex flex-col gap-3 p-1" style={{ boxShadow: submitAttempted && consentInvalid ? "0 0 0 1.5px #DC2626" : undefined, borderRadius: 6 }}>
                    {[
                      { field: "consent1", text: "I acknowledge the importance of medical supervision during GLP-1 treatment" },
                      { field: "consent2", text: "I understand this medication may have side effects such as nausea, constipation" },
                      { field: "consent3", text: "I certify that the information provided above is accurate to the best of my knowledge" },
                    ].map(({ field, text }) => (
                      <label key={field} className="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" required
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