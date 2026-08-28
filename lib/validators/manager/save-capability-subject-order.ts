import { z } from "zod";
import {
  isSubjectScope,
  type SubjectScope,
} from "@/lib/constants/subject-scope";

export const saveCapabilitySubjectOrderSchema = z.object({
  orderedIds: z
    .array(z.string().uuid())
    .min(1, { message: "At least one subject is required." }),
});

export type SaveCapabilitySubjectOrderInput = z.infer<
  typeof saveCapabilitySubjectOrderSchema
>;

export function parseSaveCapabilitySubjectOrderFormData(formData: FormData):
  | { success: true; scope: SubjectScope; data: SaveCapabilitySubjectOrderInput }
  | { success: false; error: string } {
  const scope = formData.get("scope");
  if (!isSubjectScope(scope)) {
    return { success: false, error: "Invalid subject scope." };
  }

  const raw = formData.get("orderedIds");

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(String(raw ?? "[]"));
  } catch {
    return { success: false, error: "Invalid order payload." };
  }

  const parsed = saveCapabilitySubjectOrderSchema.safeParse({
    orderedIds: parsedJson,
  });

  if (!parsed.success) {
    return { success: false, error: "Please fix the subject order." };
  }

  return { success: true, scope, data: parsed.data };
}
