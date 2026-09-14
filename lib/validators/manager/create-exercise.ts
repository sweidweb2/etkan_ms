import { z } from "zod";
import {
  formValidationFailure,
  safeParseFormData,
} from "@/lib/validators/safe-parse-form-data";
import { EXERCISE_LEVEL_VALUES } from "@/lib/constants/exercise-level";
import { EXERCISE_STATUS_VALUES } from "@/lib/constants/exercise-status";

const emptyTiptapDoc = { type: "doc", content: [{ type: "paragraph" }] };

export const tiptapDocSchema = z
  .object({
    type: z.literal("doc"),
  })
  .passthrough();

/** Shared fields for create and update exercise (no id). */
export const exerciseFieldsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: "Exercise title is required." })
    .max(200, { message: "Exercise title must be at most 200 characters." }),
  level: z.enum(EXERCISE_LEVEL_VALUES, {
    message: "Select a valid level.",
  }),
  status: z.enum(EXERCISE_STATUS_VALUES, {
    message: "Select a valid status.",
  }),
  category_ids: z
    .array(z.string().uuid({ message: "Invalid category." }))
    .min(1, { message: "Select at least one category." }),
  body: tiptapDocSchema,
});

export const createExerciseSchema = exerciseFieldsSchema;

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;

export function parseBodyFromFormData(formData: FormData): unknown {
  const raw = String(formData.get("body") ?? "").trim();
  if (!raw) {
    return emptyTiptapDoc;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function parseCategoryIds(formData: FormData): string[] {
  return formData
    .getAll("category_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);
}

export function parseCreateExerciseFormData(formData: FormData) {
  const body = parseBodyFromFormData(formData);
  if (body === null) {
    return formValidationFailure({ body: ["Exercise body is invalid."] });
  }

  return safeParseFormData(createExerciseSchema, {
    title: formData.get("title"),
    level: formData.get("level"),
    status: formData.get("status"),
    category_ids: parseCategoryIds(formData),
    body,
  });
}
