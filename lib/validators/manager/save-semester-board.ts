import { z } from "zod";
import { UNASSIGNED_TEAM_ID } from "@/lib/constants/semester-team";
import {
  createSaveBoardSchema,
  parseSaveBoardFormData,
} from "@/lib/validators/manager/board-form";

export const saveSemesterBoardSchema = createSaveBoardSchema({
  unassignedId: UNASSIGNED_TEAM_ID,
  columnNotFoundMessage: "Team not found.",
  itemNotFoundMessage: "Semester not found.",
});

export type SaveSemesterBoardInput = z.infer<typeof saveSemesterBoardSchema>;

export function parseSaveSemesterBoardFormData(formData: FormData) {
  return parseSaveBoardFormData(saveSemesterBoardSchema, formData);
}
