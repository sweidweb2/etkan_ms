import { z } from "zod";
import {
  createReorderColumnsSchema,
  parseReorderColumnsFormData,
} from "@/lib/validators/manager/board-form";

export const reorderSemesterTeamsSchema = createReorderColumnsSchema({
  columnNotFoundMessage: "Team not found.",
  emptyMessage: "At least one team is required.",
});

export type ReorderSemesterTeamsInput = z.infer<
  typeof reorderSemesterTeamsSchema
>;

export function parseReorderSemesterTeamsFormData(formData: FormData) {
  return parseReorderColumnsFormData(reorderSemesterTeamsSchema, formData);
}
