"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";

const CODE_LENGTH = 6;
const SYMBOL_KEYS = "!@#$%";
const ALLOWED_CHARS = "0123456789" + SYMBOL_KEYS;
const KEYS = ["1", "2", "3", "!", "4", "5", "6", "@", "7", "8", "9", "#", "$", "0", "%", "⌫"];
// Midpoint of the "10 to 20 seconds" window before we tell the user to reload.
const STUCK_LOGIN_MS = 15000;

export default function AdminLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [shake, setShake] = useState(false);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (status !== "submitting") return;
    const timer = setTimeout(() => setStuck(true), STUCK_LOGIN_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const submit = useCallback(
    async (fullCode: string) => {
      setStatus("submitting");
      setStuck(false);
      const result = await signIn("credentials", { code: fullCode, redirect: false });

      if (result?.error) {
        setStatus("error");
        setShake(true);
        setTimeout(() => {
          setCode("");
          setStatus("idle");
          setShake(false);
        }, 450);
      } else {
        router.push("/admin");
      }
    },
    [router]
  );

  const appendChar = useCallback(
    (ch: string) => {
      if (status === "submitting") return;
      setKeypadOpen(true);
      setCode((prev) => {
        if (prev.length >= CODE_LENGTH) return prev;
        const next = prev + ch;
        if (next.length === CODE_LENGTH) submit(next);
        return next;
      });
    },
    [status, submit]
  );

  const backspace = useCallback(() => {
    if (status === "submitting") return;
    setCode((prev) => prev.slice(0, -1));
  }, [status]);

  const handleKey = (key: string) => {
    if (key === "⌫") backspace();
    else appendChar(key);
  };

  // Physical keyboard support alongside the on-screen keypad
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace") backspace();
      else if (ALLOWED_CHARS.includes(e.key)) appendChar(e.key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [appendChar, backspace]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--teal-deep)" }}
    >
      <div
        className="w-full"
        style={{ position: "relative", maxWidth: "clamp(340px, 32vw, 480px)" }}
      >
        {/* Folded corner — back to the public site (VS-89). Sits outside the
            card's own overflow:hidden (as a sibling, not a child) so the
            hover label can float above/outside the card instead of being
            clipped by it. Breathes gently on a loop at all times; hovering
            unrolls a small label above the fold explaining what it does. */}
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Back to website"
          className="admin-back-corner"
        >
          <span className="admin-back-label-wrap">
            <span className="admin-back-label">Back to website</span>
          </span>
          <span className="admin-back-fold" />
          <span className="admin-back-arrow">←</span>
        </button>

        <div
          className="w-full rounded-[16px] overflow-hidden flex flex-col font-secure"
          style={{
            background: "var(--teal-deep)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          }}
        >
        {/* Top section — badges, logo, headline, code slots */}
        <div
          className="text-center transition-all duration-300"
          style={{
            padding: keypadOpen
              ? "clamp(20px, 2.4vw, 32px) clamp(20px, 2.6vw, 32px) clamp(14px, 1.6vw, 20px)"
              : "clamp(36px, 5vw, 64px) clamp(20px, 2.6vw, 32px) clamp(28px, 4vw, 56px)",
          }}
        >
          {/* Secure / Admin Access — slide apart once the keypad opens */}
          <div className="relative mb-5" style={{ height: "clamp(20px, 2vw, 26px)" }}>
            <span
              className="absolute top-0 font-bold uppercase rounded-full transition-all duration-300"
              style={{
                fontSize: "clamp(8.5px, 0.85vw, 10.5px)",
                letterSpacing: "0.05em",
                padding: "clamp(4px, 0.5vw, 6px) clamp(10px, 1.2vw, 14px)",
                background: "var(--teal-light)",
                color: "var(--teal-deep)",
                left: keypadOpen ? 0 : "50%",
                transform: keypadOpen ? "translateX(0)" : "translateX(-104%)",
              }}
            >
              Secure
            </span>
            <span
              className="absolute top-0 font-bold uppercase rounded-full border transition-all duration-300"
              style={{
                fontSize: "clamp(8.5px, 0.85vw, 10.5px)",
                letterSpacing: "0.05em",
                padding: "clamp(4px, 0.5vw, 6px) clamp(10px, 1.2vw, 14px)",
                borderColor: "rgba(255,255,255,0.35)",
                color: "rgba(255,255,255,0.8)",
                right: keypadOpen ? 0 : "50%",
                transform: keypadOpen ? "translateX(0)" : "translateX(104%)",
              }}
            >
              Admin Access
            </span>
          </div>

          <div
            className="overflow-hidden transition-all duration-300 mx-auto"
            style={{
              maxHeight: keypadOpen ? 0 : 64,
              opacity: keypadOpen ? 0 : 1,
              marginBottom: keypadOpen ? 0 : 16,
            }}
          >
            <Image
              src="/logo.png"
              alt="VitalStats"
              width={180}
              height={56}
              className="w-auto mx-auto"
              style={{ height: "clamp(44px, 5.5vw, 58px)", filter: "brightness(0) invert(1) opacity(0.9)" }}
            />
          </div>

          <h1
            className="uppercase font-bold text-white mb-5"
            style={{ letterSpacing: "-0.01em", fontSize: "clamp(18px, 2vw, 26px)" }}
          >
            Enter Code
          </h1>

          <div
            role="button"
            tabIndex={0}
            aria-label="Enter code"
            onClick={() => setKeypadOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setKeypadOpen(true);
            }}
            className={`flex justify-center cursor-pointer ${shake ? "animate-shake" : ""}`}
            style={{ gap: "clamp(5px, 0.7vw, 9px)" }}
          >
            {Array.from({ length: CODE_LENGTH }).map((_, i) => (
              <div
                key={i}
                className="rounded-[8px] flex items-center justify-center text-white font-bold transition-colors duration-150"
                style={{
                  width: "clamp(32px, 3.4vw, 46px)",
                  height: "clamp(40px, 4.2vw, 58px)",
                  fontSize: "clamp(16px, 1.8vw, 22px)",
                  background: "rgba(255,255,255,0.10)",
                  border: i < code.length ? "1.5px solid var(--teal-light)" : "1.5px solid rgba(255,255,255,0.28)",
                }}
              >
                {i < code.length ? "•" : ""}
              </div>
            ))}
          </div>

          {status === "error" && (
            <p className="mt-3" style={{ fontSize: "clamp(10px, 1vw, 12px)", color: "#FF8A80" }}>
              Incorrect code. Try again.
            </p>
          )}
        </div>

        {/* Keypad panel — hidden until the code slots are interacted with */}
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-out"
          style={{ gridTemplateRows: keypadOpen ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden min-h-0">
            <div
              className="rounded-t-[20px]"
              style={{ background: "var(--cream)", padding: "clamp(14px, 1.8vw, 22px)" }}
            >
              <div className="grid grid-cols-4" style={{ gap: "clamp(5px, 0.7vw, 9px)" }}>
                {KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleKey(k)}
                    disabled={status === "submitting"}
                    aria-label={k === "⌫" ? "Backspace" : `Key ${k}`}
                    className="rounded-[8px] text-center font-bold cursor-pointer transition-opacity duration-150"
                    style={{
                      padding: "clamp(10px, 1.4vw, 18px) 0",
                      fontSize: "clamp(14px, 1.6vw, 20px)",
                      background: k === "⌫" ? "transparent" : "var(--teal-pale)",
                      color: k === "⌫" ? "var(--ink-faint)" : SYMBOL_KEYS.includes(k) ? "var(--teal)" : "var(--teal-deep)",
                      opacity: status === "submitting" ? 0.5 : 1,
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p
          className="text-center"
          style={{ fontSize: "clamp(9px, 0.9vw, 11px)", padding: "clamp(12px, 1.6vw, 18px) 0", color: "rgba(255,255,255,0.3)" }}
        >
          VitalStats Admin Portal
        </p>
        </div>
      </div>

      {status === "submitting" && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.55)", zIndex: 50 }}
        >
          <div
            className="flex flex-col items-center text-center rounded-[16px] font-secure"
            style={{
              background: "var(--teal-deep)",
              padding: "clamp(28px, 4vw, 40px)",
              maxWidth: "clamp(260px, 26vw, 340px)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            }}
          >
            <Loader2
              className="animate-spin"
              style={{ width: "clamp(28px, 3vw, 36px)", height: "clamp(28px, 3vw, 36px)", color: "var(--teal-light)" }}
            />
            <p
              className="text-white font-bold mt-4"
              style={{ fontSize: "clamp(13px, 1.4vw, 15px)" }}
            >
              Signing in&hellip;
            </p>
            {stuck && (
              <p
                className="mt-3"
                style={{ fontSize: "clamp(11px, 1.1vw, 13px)", color: "#FF8A80" }}
              >
                This is taking longer than usual. Please reload the screen and log in again.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
