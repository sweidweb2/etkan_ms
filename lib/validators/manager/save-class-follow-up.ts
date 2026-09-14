import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const saveClassFollowUpSchema = z
  .object({
    class_id: z.string().uuid({ message: "Class not found." }),
    in_progress_category_ids: z.array(
      z.string().uuid({ message: "Invalid category." })
    ),
    done_category_ids: z.array(
      z.string().uuid({ message: "Invalid category." })
    ),
  })
  .superRefine((value, ctx) => {
    const inProgress = new Set(value.in_progress_category_ids);
    for (const id of value.done_category_ids) {
      if (inProgress.has(id)) {
        ctx.addIssue({
          code: "custom",
          message: "A category cannot be both in progress and done.",
          path: ["done_category_ids"],
        });
        break;
      }
    }
  });

export type SaveClassFollowUpInput = z.infer<typeof saveClassFollowUpSchema>;

function parseIds(formData: FormData, key: string): string[] {
  return [
    ...new Set(
      formData
        .getAll(key)
        .map((value) => String(value).trim())
        .filter(Boolean)
    ),
  ];
}

export function parseSaveClassFollowUpFormData(formData: FormData) {
  return safeParseFormData(saveClassFollowUpSchema, {
    class_id: formData.get("class_id"),
    in_progress_category_ids: parseIds(formData, "in_progress_category_ids"),
    done_category_ids: parseIds(formData, "done_category_ids"),
  });
}
