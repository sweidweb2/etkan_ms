import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import {
  cancelSemesterDropSchema,
  createSemesterDropSchema,
  deleteDropRefundPaymentSchema,
  dropAllSemestersSchema,
  processDropRefundSchema,
  waiveDropRefundSchema,
} from "@/lib/validators/manager/create-semester-drop";
import { SEMESTER_DROP_RESTRICTION_MODES } from "@/lib/manager/accounting/constants";

export function parseCreateSemesterDropFormData(formData: FormData) {
  const rawMode = String(formData.get("restriction_mode") ?? "").trim();
  const mode =
    rawMode === SEMESTER_DROP_RESTRICTION_MODES.AMOUNT ||
    rawMode === SEMESTER_DROP_RESTRICTION_MODES.NONE ||
    rawMode === SEMESTER_DROP_RESTRICTION_MODES.PERCENT
      ? rawMode
      : SEMESTER_DROP_RESTRICTION_MODES.PERCENT;

  return safeParseFormData(createSemesterDropSchema, {
    student_id: formData.get("student_id"),
    class_id: formData.get("class_id"),
    membership_id: formData.get("membership_id") || undefined,
    restriction_mode: mode,
    required_percent: formData.get("required_percent") || undefined,
    required_amount: formData.get("required_amount") || undefined,
    require_immediate: formData.get("require_immediate") === "true",
  });
}

export function parseCancelSemesterDropFormData(formData: FormData) {
  return safeParseFormData(cancelSemesterDropSchema, {
    request_id: formData.get("request_id"),
    class_id: formData.get("class_id"),
  });
}

export function parseProcessDropRefundFormData(formData: FormData) {
  return safeParseFormData(processDropRefundSchema, {
    request_id: formData.get("request_id"),
    amount: formData.get("amount"),
    payment_date: formData.get("payment_date"),
    payment_method: formData.get("payment_method"),
    received_by: formData.get("received_by"),
    received_by_management: formData.get("received_by_management") === "on",
    notes: formData.get("notes") || null,
  });
}

export function parseWaiveDropRefundFormData(formData: FormData) {
  return safeParseFormData(waiveDropRefundSchema, {
    request_id: formData.get("request_id"),
  });
}

export function parseDeleteDropRefundPaymentFormData(formData: FormData) {
  return safeParseFormData(deleteDropRefundPaymentSchema, {
    payment_id: formData.get("payment_id"),
  });
}

export function parseDropAllSemestersFormData(formData: FormData) {
  const rawMode = String(formData.get("restriction_mode") ?? "").trim();
  const mode =
    rawMode === SEMESTER_DROP_RESTRICTION_MODES.AMOUNT ||
    rawMode === SEMESTER_DROP_RESTRICTION_MODES.NONE ||
    rawMode === SEMESTER_DROP_RESTRICTION_MODES.PERCENT
      ? rawMode
      : SEMESTER_DROP_RESTRICTION_MODES.PERCENT;

  return safeParseFormData(dropAllSemestersSchema, {
    student_id: formData.get("student_id"),
    restriction_mode: mode,
    required_percent: formData.get("required_percent") || undefined,
    required_amount: formData.get("required_amount") || undefined,
  });
}
