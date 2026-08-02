import { z } from "zod";

const capabilityPairSchema = z.object({
  user_id: z.string().uuid(),
  subject_id: z.string().uuid(),
});

export const saveInstructorCapabilitiesSchema = z.object({
  capabilities: z.array(capabilityPairSchema),
});

export type SaveInstructorCapabilitiesInput = z.infer<
  typeof saveInstructorCapabilitiesSchema
>;

export function parseSaveInstructorCapabilitiesFormData(formData: FormData):
  | { success: true; data: SaveInstructorCapabilitiesInput }
  | { success: false; error: string } {
  const raw = formData.get("capabilities");

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(String(raw ?? "[]"));
  } catch {
    return { success: false, error: "Invalid capabilities payload." };
  }

  const parsed = saveInstructorCapabilitiesSchema.safeParse({
    capabilities: parsedJson,
  });

  if (!parsed.success) {
    return { success: false, error: "Please fix the capability selections." };
  }

  return { success: true, data: parsed.data };
}
