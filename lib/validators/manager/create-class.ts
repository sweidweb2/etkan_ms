import { z } from "zod";
import { CLASS_STATUS_VALUES } from "@/lib/constants/manager-class-status";

export { CLASS_STATUS_VALUES };

export const createClassSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Class name is required." })
    .max(120, { message: "Class name must be at most 120 characters." }),
  subject_id: z
    .string()
    .trim()
    .min(1, { message: "Subject is required." }),
  status: z.enum(CLASS_STATUS_VALUES, {
    message: "Status is required.",
  }),
  semester_id: z.string().optional().or(z.literal("")),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
