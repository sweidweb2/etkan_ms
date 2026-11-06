import { z } from "zod";
import { YES_NO_GRADE } from "@/lib/constants/task-yes-no";

export const taskYesNoFieldSchema = z.boolean().optional();

/** FormData sends strings; `z.coerce.boolean()` would read `"false"` as true. */
export function parseTaskYesNoFormValue(
  value: FormDataEntryValue | null | undefined
): boolean {
  return value === "true" || value === "on";
}

export function isYesNoGradeValue(value: number): boolean {
  return value === YES_NO_GRADE.YES || value === YES_NO_GRADE.NO;
}