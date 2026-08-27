import { z } from "zod";

export const saveMentorSubjectOrderSchema = z.object({
  orderedIds: z
    .array(z.string().uuid())
    .min(1, { message: "At least one mentor subject is required." }),
});

export type SaveMentorSubjectOrderInput = z.infer<
  typeof saveMentorSubjectOrderSchema
>;

export function parseSaveMentorSubjectOrderFormData(formData: FormData):
  | { success: true; data: SaveMentorSubjectOrderInput }
  | { success: false; error: string } {
  const raw = formData.get("orderedIds");

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(String(raw ?? "[]"));
  } catch {
    return { success: false, error: "Invalid order payload." };
  }

  const parsed = saveMentorSubjectOrderSchema.safeParse({
    orderedIds: parsedJson,
  });

  if (!parsed.success) {
    return { success: false, error: "Please fix the mentor subject order." };
  }

  return { success: true, data: parsed.data };
}
