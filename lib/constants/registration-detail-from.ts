export const REGISTRATION_DETAIL_FROM_QUERY = "from";

export const REGISTRATION_DETAIL_FROM_VALUES = [
  "registrations",
  "guest",
  "student",
] as const;

export type RegistrationDetailFrom =
  (typeof REGISTRATION_DETAIL_FROM_VALUES)[number];

export function parseRegistrationDetailFrom(
  value: string | string[] | undefined | null
): RegistrationDetailFrom {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "guest" || raw === "student") {
    return raw;
  }
  return "registrations";
}
