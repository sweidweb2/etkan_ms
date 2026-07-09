import { z } from "zod";
import { SUBSCRIBED_SEMESTER_STATUS_VALUES } from "@/lib/constants/manager-subscribed-semester-status";

export const updateSubscribedSemesterSchema = z.object({
  amount: z.coerce
    .number({ message: "Amount is required." })
    .positive({ message: "Amount must be greater than zero." }),
  status: z.enum(SUBSCRIBED_SEMESTER_STATUS_VALUES, {
    message: "Status is required.",
  }),
});

export type UpdateSubscribedSemesterInput = z.infer<
  typeof updateSubscribedSemesterSchema
>;
