import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import { STUDENT_STATUSES } from "@/lib/constants/manager-student-status";
import {
  SEMESTER_DROP_RESTRICTION_MODES,
  SEMESTER_DROP_RESTRICTION_MODE_VALUES,
} from "@/lib/manager/accounting/constants";

const booleanFromForm = z.preprocess((value) => {
  if (value === true || value === "true" || value === "on" || value === "1") {
    return true;
  }
  if (value === false || value === "false" || value === "" || value == null) {
    return false;
  }
  return value;
}, z.boolean());

function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

const restrictionValueSchema = z.preprocess(
  emptyToUndefined,
  z.coerce.number().finite().optional()
);

export const changeStudentStatusSchema = z
  .object({
    user_id: z.string().uuid({ message: "Invalid user id." }),
    target_status: z.enum(
      [STUDENT_STATUSES.ACTIVE, STUDENT_STATUSES.INACTIVE],
      {
        message: "Select activate or inactivate.",
      }
    ),
    remove_from_classes: booleanFromForm.default(false),
    remove_open_spps: booleanFromForm.default(false),
    drop_restriction_mode: z
      .enum(SEMESTER_DROP_RESTRICTION_MODE_VALUES)
      .optional()
      .default(SEMESTER_DROP_RESTRICTION_MODES.PERCENT),
    drop_required_percent: restrictionValueSchema,
    drop_required_amount: restrictionValueSchema,
  })
  .superRefine((data, ctx) => {
    if (data.target_status === STUDENT_STATUSES.ACTIVE) {
      if (data.remove_from_classes) {
        ctx.addIssue({
          code: "custom",
          path: ["remove_from_classes"],
          message: "Class removal is only allowed when inactivating.",
        });
      }
      if (data.remove_open_spps) {
        ctx.addIssue({
          code: "custom",
          path: ["remove_open_spps"],
          message: "SPP deletion is only allowed when inactivating.",
        });
      }
    }

    if (data.target_status !== STUDENT_STATUSES.INACTIVE) {
      return;
    }

    const mode =
      data.drop_restriction_mode ?? SEMESTER_DROP_RESTRICTION_MODES.PERCENT;
    if (mode === SEMESTER_DROP_RESTRICTION_MODES.PERCENT) {
      const percent = data.drop_required_percent;
      if (percent !== undefined && (percent < 0 || percent > 100)) {
        ctx.addIssue({
          code: "custom",
          path: ["drop_required_percent"],
          message: "Percent must be between 0 and 100.",
        });
      }
    }
    if (mode === SEMESTER_DROP_RESTRICTION_MODES.AMOUNT) {
      const amount = data.drop_required_amount;
      if (amount !== undefined && amount < 0) {
        ctx.addIssue({
          code: "custom",
          path: ["drop_required_amount"],
          message: "Amount must be at least 0.",
        });
      }
    }
  })
  .transform((data) => {
    let mode =
      data.drop_restriction_mode ?? SEMESTER_DROP_RESTRICTION_MODES.PERCENT;
    let requiredPercent = data.drop_required_percent ?? null;
    let requiredAmount = data.drop_required_amount ?? null;

    if (mode === SEMESTER_DROP_RESTRICTION_MODES.PERCENT) {
      if (requiredPercent === null || requiredPercent === 0) {
        mode = SEMESTER_DROP_RESTRICTION_MODES.NONE;
        requiredPercent = null;
        requiredAmount = null;
      } else {
        requiredAmount = null;
      }
    } else if (mode === SEMESTER_DROP_RESTRICTION_MODES.AMOUNT) {
      if (requiredAmount === null || requiredAmount === 0) {
        mode = SEMESTER_DROP_RESTRICTION_MODES.NONE;
        requiredPercent = null;
        requiredAmount = null;
      } else {
        requiredPercent = null;
      }
    } else {
      requiredPercent = null;
      requiredAmount = null;
    }

    return {
      user_id: data.user_id,
      target_status: data.target_status,
      remove_from_classes: data.remove_from_classes,
      remove_open_spps: data.remove_open_spps,
      drop_restriction_mode: mode,
      drop_required_percent: requiredPercent,
      drop_required_amount: requiredAmount,
    };
  });

export type ChangeStudentStatusInput = z.infer<typeof changeStudentStatusSchema>;

export function parseChangeStudentStatusFormData(formData: FormData) {
  const rawMode = String(formData.get("drop_restriction_mode") ?? "").trim();
  const mode =
    rawMode === SEMESTER_DROP_RESTRICTION_MODES.AMOUNT ||
    rawMode === SEMESTER_DROP_RESTRICTION_MODES.NONE ||
    rawMode === SEMESTER_DROP_RESTRICTION_MODES.PERCENT
      ? rawMode
      : SEMESTER_DROP_RESTRICTION_MODES.PERCENT;

  return safeParseFormData(changeStudentStatusSchema, {
    user_id: formData.get("user_id"),
    target_status: formData.get("target_status"),
    remove_from_classes: formData.get("remove_from_classes"),
    remove_open_spps: formData.get("remove_open_spps"),
    drop_restriction_mode: mode,
    drop_required_percent: formData.get("drop_required_percent") || undefined,
    drop_required_amount: formData.get("drop_required_amount") || undefined,
  });
}
