import { z } from "zod";
import {
  createReorderColumnsSchema,
  parseReorderColumnsFormData,
} from "@/lib/validators/manager/board-form";

export const reorderStagesSchema = createReorderColumnsSchema({
  columnNotFoundMessage: "Stage not found.",
  emptyMessage: "At least one stage is required.",
});

export type ReorderStagesInput = z.infer<typeof reorderStagesSchema>;

export function parseReorderStagesFormData(formData: FormData) {
  return parseReorderColumnsFormData(reorderStagesSchema, formData);
}
