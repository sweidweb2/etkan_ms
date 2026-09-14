import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import { WORKSHOP_STATUS_VALUES } from "@/lib/constants/manager-workshop-status";

export const changeWorkshopStatusSchema = z.object({
  id: z.string().uuid({ message: "Invalid workshop id." }),
  status: z.enum(WORKSHOP_STATUS_VALUES, {
    message: "Select a valid workshop status.",
  }),
});

export type ChangeWorkshopStatusInput = z.infer<
  typeof changeWorkshopStatusSchema
>;

export function parseChangeWorkshopStatusFormData(formData: FormData) {
  return safeParseFormData(changeWorkshopStatusSchema, {
    id: formData.get("id"),
    status: formData.get("status"),
  });
}
