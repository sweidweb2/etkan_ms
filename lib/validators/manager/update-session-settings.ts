import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import {
  SESSION_GROUP_GRADE_LEVELS,
  type SessionGroupGradeLevelValue,
} from "@/types/manager-session-group-grade";
import type { FieldErrors } from "@/types/auth";

const GROUP_GRADE_VALUES = [
  SESSION_GROUP_GRADE_LEVELS.VERY_LOW,
  SESSION_GROUP_GRADE_LEVELS.LOW,
  SESSION_GROUP_GRADE_LEVELS.MEDIUM,
  SESSION_GROUP_GRADE_LEVELS.HIGH,
  SESSION_GROUP_GRADE_LEVELS.VERY_HIGH,
] as const;

export const updateSessionSettingsSchema = z.object({
  semester_id: z
    .union([z.literal(""), z.string().uuid({ message: "Invalid semester." })])
    .optional(),
  group_grade_level: z
    .union([
      z.literal(""),
      z.enum(GROUP_GRADE_VALUES, { message: "Invalid group grade level." }),
    ])
    .optional(),
  session_report: z
    .string()
    .trim()
    .max(5000, {
      message: "Session report must be at most 5000 characters.",
    })
    .optional(),
});

export type UpdateSessionSettingsInput = z.infer<
  typeof updateSessionSettingsSchema
>;

export function parseUpdateSessionSettingsFormData(formData: FormData):
  | {
      success: true;
      data: UpdateSessionSettingsInput & { session_id: string; class_id: string };
    }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const session_id = String(formData.get("session_id") ?? "").trim();
  const class_id = String(formData.get("class_id") ?? "").trim();

  if (!session_id || !class_id) {
    return { success: false, error: "Session and class are required." };
  }

  const parsed = updateSessionSettingsSchema.safeParse({
    semester_id: formData.get("semester_id") ?? undefined,
    group_grade_level: formData.get("group_grade_level") ?? undefined,
    session_report: formData.has("session_report")
      ? String(formData.get("session_report") ?? "")
      : undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return {
    success: true,
    data: {
      session_id,
      class_id,
      ...parsed.data,
    },
  };
}

export type { SessionGroupGradeLevelValue };
