import { z } from "zod";
import { SUBJECT_SCOPE_VALUES } from "@/lib/constants/subject-scope";

export const setSubjectCapabilitySchema = z.object({
  user_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  enabled: z.boolean(),
});

export const setSubjectCapabilityInputSchema = setSubjectCapabilitySchema.extend(
  {
    scope: z.enum(SUBJECT_SCOPE_VALUES),
  }
);

export type SetSubjectCapabilityInput = z.infer<
  typeof setSubjectCapabilityInputSchema
>;

export function parseSetSubjectCapabilityInput(
  input: unknown
):
  | { success: true; data: SetSubjectCapabilityInput }
  | { success: false; error: string } {
  const parsed = setSubjectCapabilityInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid capability selection." };
  }
  return { success: true, data: parsed.data };
}
