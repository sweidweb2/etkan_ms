import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const reorderStagesSchema = z.object({
  ordered_ids: z
    .array(z.string().uuid({ message: "Stage not found." }))
    .min(1, { message: "At least one stage is required." }),
});

export type ReorderStagesInput = z.infer<typeof reorderStagesSchema>;

export function parseReorderStagesFormData(formData: FormData) {
  let orderedIds: unknown = [];
  const raw = formData.get("ordered_ids");
  if (typeof raw === "string" && raw.trim()) {
    try {
      orderedIds = JSON.parse(raw);
    } catch {
      orderedIds = [];
    }
  }

  return safeParseFormData(reorderStagesSchema, {
    ordered_ids: orderedIds,
  });
}
