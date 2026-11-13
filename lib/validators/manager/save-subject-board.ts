import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import { UNASSIGNED_STAGE_ID } from "@/lib/constants/subject-stage";

const columnIdSchema = z.union([
  z.literal(UNASSIGNED_STAGE_ID),
  z.string().uuid({ message: "Stage not found." }),
]);

export const saveSubjectBoardSchema = z.object({
  columns: z.record(
    columnIdSchema,
    z.array(z.string().uuid({ message: "Subject not found." }))
  ),
});

export type SaveSubjectBoardInput = z.infer<typeof saveSubjectBoardSchema>;

export function parseSaveSubjectBoardFormData(formData: FormData) {
  let columns: unknown = {};
  const raw = formData.get("columns");
  if (typeof raw === "string" && raw.trim()) {
    try {
      columns = JSON.parse(raw);
    } catch {
      columns = {};
    }
  }

  return safeParseFormData(saveSubjectBoardSchema, {
    columns,
  });
}
