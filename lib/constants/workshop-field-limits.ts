import { AUTH_LIMITS } from "@/lib/constants/auth-limits";

/** Shared min/max for workshop create/edit/instructor/payment forms (UI + Zod). */
export const WORKSHOP_FIELD_LIMITS = {
  name: { max: 200 },
  phone: { max: AUTH_LIMITS.phone.max },
  subject: { max: 200 },
  target_audience: { max: 500 },
  proposal_notes: { max: 5000 },
  delivery_place: { max: 300 },
  nb_participants: { min: 0, max: 100_000 },
  number_of_sessions: { min: 1, max: 1_000 },
  price: { min: 0, max: 1_000_000 },
  wage_amount: { min: 0, max: 1_000_000 },
  wage_percentage: { min: 0, max: 100 },
  instructor_notes: { max: 2_000 },
  payment_amount: { min: 0.01, max: 1_000_000 },
  payment_notes: { max: 500 },
} as const;

/** Instructor / workshop / weekly schedule slot field bounds. */
export const SCHEDULE_SLOT_FIELD_LIMITS = {
  name: { max: 120 },
} as const;

/** Instructor / workshop schedule slot duration bounds (minutes). */
export const SCHEDULE_SLOT_DURATION_LIMITS = {
  minMinutes: 15,
  /** Same-day slots only — nearly a full calendar day (leave room for min length). */
  maxMinutes: 24 * 60 - 15,
} as const;
