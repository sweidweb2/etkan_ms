import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const syncSubjectCatalogLinksSchema = z.object({
  subject_id: z.string().uuid({ message: "Subject not found." }),
  category_ids: z.array(z.string().uuid({ message: "Invalid category." })),
  exercise_ids: z.array(z.string().uuid({ message: "Invalid exercise." })),
});

export type SyncSubjectCatalogLinksInput = z.infer<
  typeof syncSubjectCatalogLinksSchema
>;

function parseIds(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

export function parseSyncSubjectCatalogLinksFormData(formData: FormData) {
  return safeParseFormData(syncSubjectCatalogLinksSchema, {
    subject_id: formData.get("subject_id"),
    category_ids: parseIds(formData, "category_ids"),
    exercise_ids: parseIds(formData, "exercise_ids"),
  });
}
