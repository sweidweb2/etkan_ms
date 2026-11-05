import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import {
  cancelSemesterDropSchema,
  createSemesterDropSchema,
  processDropRefundSchema,
} from "@/lib/validators/manager/create-semester-drop";

export function parseCreateSemesterDropFormData(formData: FormData) {
  return safeParseFormData(createSemesterDropSchema, {
    student_id: formData.get("student_id"),
    class_id: formData.get("class_id"),
    membership_id: formData.get("membership_id") || undefined,
    required_percent: formData.get("required_percent") || 50,
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
