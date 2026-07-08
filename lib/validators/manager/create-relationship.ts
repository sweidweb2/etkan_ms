import { z } from "zod";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";

export const createRelationshipSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Contact name is required." })
    .max(100, { message: "Contact name must be at most 100 characters." }),
  phone: z
    .string()
    .trim()
    .max(AUTH_LIMITS.phone.max, {
      message: `Phone must be at most ${AUTH_LIMITS.phone.max} characters.`,
    })
    .optional()
    .or(z.literal("")),
  relation_with: z
    .string()
    .trim()
    .max(50, { message: "Relation must be at most 50 characters." })
    .optional()
    .or(z.literal("")),
  major: z
    .string()
    .trim()
    .max(100, { message: "Major must be at most 100 characters." })
    .optional()
    .or(z.literal("")),
  speciality: z
    .string()
    .trim()
    .max(100, { message: "Speciality must be at most 100 characters." })
    .optional()
    .or(z.literal("")),
  is_useful: z.boolean(),
});

export type CreateRelationshipInput = z.infer<typeof createRelationshipSchema>;
