import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import { WORKSHOP_FIELD_LIMITS } from "@/lib/constants/workshop-field-limits";

const optionalProposalNotes = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}, z
  .string()
  .max(WORKSHOP_FIELD_LIMITS.proposal_notes.max, {
    message: `Proposal notes must be at most ${WORKSHOP_FIELD_LIMITS.proposal_notes.max} characters.`,
  })
  .nullable());

export const updateWorkshopProposalNotesSchema = z.object({
  id: z.string().uuid({ message: "Invalid workshop id." }),
  proposal_notes: optionalProposalNotes,
});

export type UpdateWorkshopProposalNotesInput = z.infer<
  typeof updateWorkshopProposalNotesSchema
>;

export function parseUpdateWorkshopProposalNotesFormData(formData: FormData) {
  return safeParseFormData(updateWorkshopProposalNotesSchema, {
    id: formData.get("id"),
    proposal_notes: formData.get("proposal_notes"),
  });
}
