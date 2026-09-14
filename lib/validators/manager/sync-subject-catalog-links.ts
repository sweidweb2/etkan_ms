import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

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

export function parseSyncSubjectCatalogLinksFormData(formData: FormData):
  | { success: true; data: SyncSubjectCatalogLinksInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = syncSubjectCatalogLinksSchema.safeParse({
    subject_id: formData.get("subject_id"),
    category_ids: parseIds(formData, "category_ids"),
    exercise_ids: parseIds(formData, "exercise_ids"),
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
