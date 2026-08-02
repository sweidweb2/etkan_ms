import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { workshopFieldsSchema } from "@/lib/validators/manager/create-workshop";
import type { FieldErrors } from "@/types/auth";

export const updateWorkshopSchema = workshopFieldsSchema
  .extend({
    id: z.string().uuid({ message: "Invalid workshop id." }),
  })
  .refine(
    (data) =>
      data.start_date == null ||
      data.end_date == null ||
      data.end_date >= data.start_date,
    {
      message: "End date must be on or after start date.",
      path: ["end_date"],
    }
  );

export type UpdateWorkshopInput = z.infer<typeof updateWorkshopSchema>;

export function parseUpdateWorkshopFormData(formData: FormData):
  | { success: true; data: UpdateWorkshopInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateWorkshopSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    subject: formData.get("subject"),
    target_audience: formData.get("target_audience"),
    proposal_notes: formData.get("proposal_notes"),
    delivery_place: formData.get("delivery_place"),
    nb_participants: formData.get("nb_participants"),
    number_of_sessions: formData.get("number_of_sessions"),
    price: formData.get("price"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
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
