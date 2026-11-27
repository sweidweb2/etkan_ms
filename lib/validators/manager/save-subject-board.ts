import { z } from "zod";
import { UNASSIGNED_STAGE_ID } from "@/lib/constants/subject-stage";
import {
  createSaveBoardSchema,
  parseSaveBoardFormData,
} from "@/lib/validators/manager/board-form";

export const saveSubjectBoardSchema = createSaveBoardSchema({
  unassignedId: UNASSIGNED_STAGE_ID,
  columnNotFoundMessage: "Stage not found.",
  itemNotFoundMessage: "Subject not found.",
});

export type SaveSubjectBoardInput = z.infer<typeof saveSubjectBoardSchema>;

export function parseSaveSubjectBoardFormData(formData: FormData) {
  return parseSaveBoardFormData(saveSubjectBoardSchema, formData);
}
