import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

const optionalProposalNotes = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}, z
  .string()
  .max(5000, { message: "Proposal notes must be at most 5000 characters." })
  .nullable());

export const updateWorkshopProposalNotesSchema = z.object({
  id: z.string().uuid({ message: "Invalid workshop id." }),
  proposal_notes: optionalProposalNotes,
});

export type UpdateWorkshopProposalNotesInput = z.infer<
  typeof updateWorkshopProposalNotesSchema
>;

export function parseUpdateWorkshopProposalNotesFormData(formData: FormData):
  | { success: true; data: UpdateWorkshopProposalNotesInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateWorkshopProposalNotesSchema.safeParse({
    id: formData.get("id"),
    proposal_notes: formData.get("proposal_notes"),
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
