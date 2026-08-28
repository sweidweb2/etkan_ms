import { z } from "zod";

export const addMentorsSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, "Select at least one user."),
});

export type AddMentorsInput = z.infer<typeof addMentorsSchema>;

export function parseAddMentorsFormData(
  formData: FormData
):
  { success: true; data: AddMentorsInput } | { success: false; error: string } {
  const raw = formData.get("userIds");

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(String(raw ?? "[]"));
  } catch {
    return { success: false, error: "Invalid user selection." };
  }

  const parsed = addMentorsSchema.safeParse({ userIds: parsedJson });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Select at least one user.",
    };
  }

  return { success: true, data: parsed.data };
}
