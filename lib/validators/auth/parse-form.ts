import type { FieldErrors } from "@/types/auth";

export function zodFieldErrors(
  fieldErrors: Record<string, string[] | undefined>
): FieldErrors {
  const result: FieldErrors = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) {
      result[key] = [messages[0]];
    }
  }
  return result;
}
