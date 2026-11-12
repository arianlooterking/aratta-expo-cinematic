// Sign-in helpers shared by the sign-in and password screens. Pure functions
// so they can be tested in Node.

export type SignInProvider = "google" | "apple";

/**
 * Which Google / Apple buttons to show. They only work after the provider is
 * set up in Supabase (docs/staff-platform.md), so they stay hidden until
 * NEXT_PUBLIC_SIGN_IN_PROVIDERS lists them, e.g. "google,apple".
 */
export function signInProviders(setting: string | undefined | null): SignInProvider[] {
  const wanted = (setting ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase());
  return (["google", "apple"] as const).filter((provider) => wanted.includes(provider));
}

export type SignInProblem = "credentials" | "too-many" | "offline" | "unknown";

type AuthFailure = { code?: unknown; status?: unknown; name?: unknown; message?: unknown };

/** Turns a sign-in failure into a reason the screen can explain. */
export function signInProblem(error: unknown): SignInProblem {
  const failure = (error ?? {}) as AuthFailure;
  const code = typeof failure.code === "string" ? failure.code : "";
  const message = typeof failure.message === "string" ? failure.message : "";
  const status = typeof failure.status === "number" ? failure.status : 0;
  if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) return "credentials";
  if (code === "email_not_confirmed" || code === "user_banned") return "credentials";
  if (status === 429 || /rate limit/i.test(code) || /rate limit/i.test(message)) return "too-many";
  if (failure.name === "AuthRetryableFetchError" || /failed to fetch|networkerror|fetch failed|load failed/i.test(message)) return "offline";
  return "unknown";
}

export type PasswordProblem = "short" | "long" | "mismatch" | "same" | "weak" | "session" | "offline" | "unknown";

/** Turns a failed password change into a reason the screen can explain. */
export function passwordChangeProblem(error: unknown): PasswordProblem {
  const failure = (error ?? {}) as AuthFailure;
  const code = typeof failure.code === "string" ? failure.code : "";
  const message = typeof failure.message === "string" ? failure.message : "";
  if (code === "same_password" || /different from the old password/i.test(message)) return "same";
  if (code === "weak_password" || /password should/i.test(message)) return "weak";
  if (code === "session_not_found" || code === "reauthentication_needed" || /session missing|not authenticated/i.test(message)) return "session";
  if (failure.name === "AuthRetryableFetchError" || /failed to fetch|networkerror|fetch failed|load failed/i.test(message)) return "offline";
  return "unknown";
}
