import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const reorderSemesterTeamsSchema = z.object({
  ordered_ids: z
    .array(z.string().uuid({ message: "Team not found." }))
    .min(1, { message: "At least one team is required." }),
});

export type ReorderSemesterTeamsInput = z.infer<
  typeof reorderSemesterTeamsSchema
>;

export function parseReorderSemesterTeamsFormData(formData: FormData) {
  let orderedIds: unknown = [];
  const raw = formData.get("ordered_ids");
  if (typeof raw === "string" && raw.trim()) {
    try {
      orderedIds = JSON.parse(raw);
    } catch {
      orderedIds = [];
    }
  }

  return safeParseFormData(reorderSemesterTeamsSchema, {
    ordered_ids: orderedIds,
  });
}
