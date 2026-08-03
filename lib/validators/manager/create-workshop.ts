import { z } from "zod";
import { WORKSHOP_FIELD_LIMITS } from "@/lib/constants/workshop-field-limits";
import { WORKSHOP_OFFERING_TYPE_VALUES } from "@/lib/constants/manager-workshop-display";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

function optionalTrimmedString(max: number, message: string) {
  return z.preprocess((value) => {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
    return trimmed === "" ? null : trimmed;
  }, z.string().max(max, { message }).nullable());
}

function optionalDate(message: string) {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }
    return typeof value === "string" ? value.trim() : value;
  }, z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message })
    .nullable());
}

function optionalNonNegativeNumber(
  message: string,
  max: number,
  maxMessage: string
) {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }
    return value;
  }, z.coerce
    .number()
    .min(0, { message })
    .max(max, { message: maxMessage })
    .nullable());
}

function optionalNonNegativeInt(
  message: string,
  max: number,
  maxMessage: string
) {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }
    return value;
  }, z.coerce
    .number()
    .int({ message: "Must be a whole number." })
    .min(0, { message })
    .max(max, { message: maxMessage })
    .nullable());
}

function optionalPositiveInt(
  message: string,
  max: number,
  maxMessage: string
) {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }
    return value;
  }, z.coerce
    .number()
    .int({ message: "Must be a whole number." })
    .min(1, { message })
    .max(max, { message: maxMessage })
    .nullable());
}

export const workshopFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Workshop name is required." })
    .max(WORKSHOP_FIELD_LIMITS.name.max, {
      message: `Workshop name must be at most ${WORKSHOP_FIELD_LIMITS.name.max} characters.`,
    }),
  type: z.enum(WORKSHOP_OFFERING_TYPE_VALUES, {
    message: "Select a type: course, online, or workshop.",
  }),
  phone: optionalTrimmedString(
    WORKSHOP_FIELD_LIMITS.phone.max,
    `Phone must be at most ${WORKSHOP_FIELD_LIMITS.phone.max} characters.`
  ),
  subject: optionalTrimmedString(
    WORKSHOP_FIELD_LIMITS.subject.max,
    `Subject must be at most ${WORKSHOP_FIELD_LIMITS.subject.max} characters.`
  ),
  target_audience: optionalTrimmedString(
    WORKSHOP_FIELD_LIMITS.target_audience.max,
    `Target audience must be at most ${WORKSHOP_FIELD_LIMITS.target_audience.max} characters.`
  ),
  proposal_notes: optionalTrimmedString(
    WORKSHOP_FIELD_LIMITS.proposal_notes.max,
    `Proposal notes must be at most ${WORKSHOP_FIELD_LIMITS.proposal_notes.max} characters.`
  ),
  delivery_place: optionalTrimmedString(
    WORKSHOP_FIELD_LIMITS.delivery_place.max,
    `Delivery place must be at most ${WORKSHOP_FIELD_LIMITS.delivery_place.max} characters.`
  ),
  nb_participants: optionalNonNegativeInt(
    "Number of participants must be 0 or greater.",
    WORKSHOP_FIELD_LIMITS.nb_participants.max,
    `Number of participants must be at most ${WORKSHOP_FIELD_LIMITS.nb_participants.max.toLocaleString()}.`
  ),
  number_of_sessions: optionalPositiveInt(
    "Number of sessions must be at least 1.",
    WORKSHOP_FIELD_LIMITS.number_of_sessions.max,
    `Number of sessions must be at most ${WORKSHOP_FIELD_LIMITS.number_of_sessions.max.toLocaleString()}.`
  ),
  price: optionalNonNegativeNumber(
    "Price must be 0 or greater.",
    WORKSHOP_FIELD_LIMITS.price.max,
    `Price must be at most ${WORKSHOP_FIELD_LIMITS.price.max.toLocaleString()}.`
  ),
  start_date: optionalDate("Start date must be YYYY-MM-DD."),
  end_date: optionalDate("End date must be YYYY-MM-DD."),
});

function withDateOrderRefine<T extends z.ZodType>(schema: T) {
  return schema.refine(
    (data) => {
      const row = data as {
        start_date?: string | null;
        end_date?: string | null;
      };
      return (
        row.start_date == null ||
        row.end_date == null ||
        row.end_date >= row.start_date
      );
    },
    {
      message: "End date must be on or after start date.",
      path: ["end_date"],
    }
  );
}

export const createWorkshopSchema = withDateOrderRefine(workshopFieldsSchema);

export type CreateWorkshopInput = z.infer<typeof createWorkshopSchema>;

export function parseCreateWorkshopFormData(formData: FormData):
  | { success: true; data: CreateWorkshopInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createWorkshopSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    phone: formData.get("phone"),
    subject: formData.get("subject"),
    target_audience: formData.get("target_audience"),
    proposal_notes: formData.get("proposal_notes"),
    delivery_place: formData.get("delivery_place"),
    nb_participants: formData.get("nb_participants"),
    number_of_sessions: formData.get("number_of_sessions"),
    price: formData.get("price"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}
