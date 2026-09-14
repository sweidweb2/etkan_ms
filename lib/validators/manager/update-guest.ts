import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import {
  clearReferredFromOtherWhenNotOther,
  guestIntakeFieldsSchema,
  refineReferredFromOther,
} from "@/lib/validators/manager/create-guest";

export const updateGuestSchema = guestIntakeFieldsSchema
  .extend({
    id: z.string().uuid({ message: "Invalid guest id." }),
  })
  .superRefine(refineReferredFromOther)
  .transform(clearReferredFromOtherWhenNotOther);

export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;

export function parseUpdateGuestFormData(formData: FormData) {
  return safeParseFormData(updateGuestSchema, {
    id: formData.get("id"),
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    age: formData.get("age"),
    school_or_university: formData.get("school_or_university"),
    education_level: formData.get("education_level"),
    interested_service: formData.get("interested_service"),
    referred_from: formData.get("referred_from"),
    referred_from_other: formData.get("referred_from_other"),
    notes: formData.get("notes"),
  });
}
