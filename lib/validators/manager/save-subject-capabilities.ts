import { z } from "zod";

const capabilityPairSchema = z.object({
  user_id: z.string().uuid(),
  subject_id: z.string().uuid(),
});

export const saveSubjectCapabilitiesSchema = z.object({
  capabilities: z.array(capabilityPairSchema),
});

export type SaveSubjectCapabilitiesInput = z.infer<
  typeof saveSubjectCapabilitiesSchema
>;
