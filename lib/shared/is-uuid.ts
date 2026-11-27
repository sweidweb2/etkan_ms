import { z } from "zod";

export function isUuid(value: string): boolean {
  return z.string().uuid().safeParse(value).success;
}

export function isInvalidUuidError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("invalid input syntax for type uuid") ||
    normalized.includes("22p02")
  );
}
