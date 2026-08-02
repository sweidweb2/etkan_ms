import { z } from "zod";

export const addInstructorsSchema = z.object({
  userIds: z
    .array(z.string().uuid())
    .min(1, "Select at least one user."),
});

export type AddInstructorsInput = z.infer<typeof addInstructorsSchema>;

export function parseAddInstructorsFormData(formData: FormData):
  | { success: true; data: AddInstructorsInput }
  | { success: false; error: string } {
  const raw = formData.get("userIds");

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(String(raw ?? "[]"));
  } catch {
    return { success: false, error: "Invalid user selection." };
  }

  const parsed = addInstructorsSchema.safeParse({ userIds: parsedJson });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Select at least one user.",
    };
  }

  return { success: true, data: parsed.data };
}
