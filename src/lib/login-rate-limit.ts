// In-memory brute-force guard for the admin passcode login (VS-161). The
// public form endpoints (submit-form, inquiries) throttle by counting rows
// in Postgres, but login attempts aren't persisted anywhere — so this keeps
// its own per-IP counters. Resets on process restart and isn't shared across
// instances in a horizontally-scaled deployment, but this app runs as a
// single Next.js process, and it directly stops a naive scripted brute force.
const attempts = new Map<string, { count: number; firstAttemptAt: number }>();

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

export function isLoginRateLimited(key: string, now = Date.now()): boolean {
  const attempt = attempts.get(key);
  if (!attempt) return false;
  if (now - attempt.firstAttemptAt >= LOGIN_LOCKOUT_WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return attempt.count >= MAX_LOGIN_ATTEMPTS;
}

export function recordFailedLogin(key: string, now = Date.now()): void {
  const attempt = attempts.get(key);
  if (!attempt || now - attempt.firstAttemptAt >= LOGIN_LOCKOUT_WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttemptAt: now });
  } else {
    attempt.count += 1;
  }
}

export function clearLoginAttempts(key: string): void {
  attempts.delete(key);
}
