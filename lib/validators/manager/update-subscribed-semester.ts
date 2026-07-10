import { z } from "zod";
import { SUBSCRIBED_SEMESTER_STATUS_VALUES } from "@/lib/constants/manager-subscribed-semester-status";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const updateSubscribedSemesterSchema = z.object({
  id: z.string().trim().uuid({ message: "Subscription is required." }),
  amount: z.coerce
    .number({ message: "Amount is required." })
    .positive({ message: "Amount must be greater than zero." }),
  status: z.enum(SUBSCRIBED_SEMESTER_STATUS_VALUES, {
    message: "Status is required.",
  }),
});

export type UpdateSubscribedSemesterInput = z.infer<
  typeof updateSubscribedSemesterSchema
>;

export function parseUpdateSubscribedSemesterFormData(formData: FormData):
  | { success: true; data: UpdateSubscribedSemesterInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateSubscribedSemesterSchema.safeParse({
    id: formData.get("id"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}
