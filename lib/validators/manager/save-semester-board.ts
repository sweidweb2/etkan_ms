import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import { UNASSIGNED_TEAM_ID } from "@/lib/constants/semester-team";

const columnIdSchema = z.union([
  z.literal(UNASSIGNED_TEAM_ID),
  z.string().uuid({ message: "Team not found." }),
]);

export const saveSemesterBoardSchema = z.object({
  columns: z.record(
    columnIdSchema,
    z.array(z.string().uuid({ message: "Semester not found." }))
  ),
});

export type SaveSemesterBoardInput = z.infer<typeof saveSemesterBoardSchema>;

export function parseSaveSemesterBoardFormData(formData: FormData) {
  let columns: unknown = {};
  const raw = formData.get("columns");
  if (typeof raw === "string" && raw.trim()) {
    try {
      columns = JSON.parse(raw);
    } catch {
      columns = {};
    }
  }

  return safeParseFormData(saveSemesterBoardSchema, {
    columns,
  });
}
