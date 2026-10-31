import { z } from "zod";
import { formValidationFailure } from "@/lib/validators/safe-parse-form-data";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { ATTENDEE_STATUS_VALUES } from "@/lib/constants/manager-attendee-status";
import type { FieldErrors } from "@/types/auth";

export const updateAttendeeSchema = z.object({
  status: z.enum(ATTENDEE_STATUS_VALUES, {
    message: "Status is required.",
  }),
});

export type UpdateAttendeeInput = z.infer<typeof updateAttendeeSchema>;

export function parseUpdateAttendeeFormData(formData: FormData):
  | {
      success: true;
      data: UpdateAttendeeInput & {
        id: string;
        session_id: string;
        class_id: string;
      };
    }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const id = String(formData.get("id") ?? "").trim();
  const session_id = String(formData.get("session_id") ?? "").trim();
  const class_id = String(formData.get("class_id") ?? "").trim();

  if (!id || !session_id || !class_id) {
    return { success: false, error: "Attendee, session, and class are required." };
  }

  const parsed = updateAttendeeSchema.safeParse({
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return formValidationFailure(zodFieldErrors(parsed.error.flatten().fieldErrors));
  }

  return {
    success: true,
    data: {
      id,
      session_id,
      class_id,
      ...parsed.data,
    },
  };
}
