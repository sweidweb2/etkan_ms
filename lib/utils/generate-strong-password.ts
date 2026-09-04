import { AUTH_LIMITS } from "@/lib/constants/auth-limits";

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*-_=+?";
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

const DEFAULT_LENGTH = 16;

function randomIndex(maxExclusive: number): number {
  if (maxExclusive <= 0) {
    throw new Error("maxExclusive must be positive.");
  }

  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0]! % maxExclusive;
}

function pickChar(charset: string): string {
  return charset[randomIndex(charset.length)]!;
}

function shuffleInPlace(chars: string[]): void {
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    const tmp = chars[i]!;
    chars[i] = chars[j]!;
    chars[j] = tmp;
  }
}

/**
 * Cryptographically random password with lower, upper, digit, and symbol.
 * Safe for client and server (Web Crypto).
 */
export function generateStrongPassword(
  length: number = DEFAULT_LENGTH
): string {
  const size = Math.max(
    AUTH_LIMITS.password.min,
    Math.min(length, AUTH_LIMITS.password.max)
  );

  const chars = [
    pickChar(LOWER),
    pickChar(UPPER),
    pickChar(DIGITS),
    pickChar(SYMBOLS),
  ];

  while (chars.length < size) {
    chars.push(pickChar(ALL));
  }

  shuffleInPlace(chars);
  return chars.join("");
}
