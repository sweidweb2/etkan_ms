import "server-only";

import {
  TURNSTILE_TOKEN_MAX_LENGTH,
  TURNSTILE_VERIFY_FAILED_MESSAGE,
} from "@/lib/constants/turnstile";

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface SiteverifyResponse {
  success?: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
}

export type VerifyTurnstileResult =
  | { ok: true }
  | { ok: false; error: string };

function getTurnstileSecret(): string | null {
  const secret = process.env.TURNSTILE_SECRET?.trim();
  return secret || null;
}

export function getTurnstileExpectedHostnames(): Set<string> {
  return new Set(
    (process.env.TURNSTILE_HOSTNAMES ?? "")
      .split(",")
      .map((hostname) => hostname.trim())
      .filter(Boolean)
  );
}

export function getTurnstileSiteKey(): string | null {
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim();
  return siteKey || null;
}

function failed(): VerifyTurnstileResult {
  return { ok: false, error: TURNSTILE_VERIFY_FAILED_MESSAGE };
}

export async function verifyTurnstileToken(options: {
  token: unknown;
  expectedAction: string;
  remoteip?: string | null;
}): Promise<VerifyTurnstileResult> {
  const secret = getTurnstileSecret();
  const expectedHostnames = getTurnstileExpectedHostnames();
  const siteKey = getTurnstileSiteKey();
  const token = typeof options.token === "string" ? options.token : "";

  if (
    !secret ||
    !siteKey ||
    expectedHostnames.size === 0 ||
    token.length === 0 ||
    token.length > TURNSTILE_TOKEN_MAX_LENGTH
  ) {
    return failed();
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });
  const remoteip = options.remoteip?.trim();
  if (remoteip && remoteip !== "unknown") {
    body.set("remoteip", remoteip);
  }

  let result: SiteverifyResponse;
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(10_000),
      body,
    });
    if (!response.ok) {
      return failed();
    }
    result = (await response.json()) as SiteverifyResponse;
  } catch {
    return failed();
  }

  if (
    !result.success ||
    result.action !== options.expectedAction ||
    typeof result.hostname !== "string" ||
    !expectedHostnames.has(result.hostname)
  ) {
    return failed();
  }

  return { ok: true };
}
