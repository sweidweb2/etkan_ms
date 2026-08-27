import { z } from "zod";

export const setInstructorCapabilitySchema = z.object({
  user_id: z.string().uuid(),
  mentor_subject_id: z.string().uuid(),
  enabled: z.boolean(),
});

export type SetInstructorCapabilityInput = z.infer<
  typeof setInstructorCapabilitySchema
>;

export function parseSetInstructorCapabilityInput(
  input: unknown
):
  | { success: true; data: SetInstructorCapabilityInput }
  | { success: false; error: string } {
  const parsed = setInstructorCapabilitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid capability selection." };
  }
  return { success: true, data: parsed.data };
}
