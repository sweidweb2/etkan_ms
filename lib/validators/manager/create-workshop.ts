import { z } from "zod";
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
    .max(200, { message: "Workshop name must be at most 200 characters." }),
  subject: optionalTrimmedString(
    200,
    "Subject must be at most 200 characters."
  ),
  target_audience: optionalTrimmedString(
    500,
    "Target audience must be at most 500 characters."
  ),
  proposal_notes: optionalTrimmedString(
    5000,
    "Proposal notes must be at most 5000 characters."
  ),
  delivery_place: optionalTrimmedString(
    300,
    "Delivery place must be at most 300 characters."
  ),
  nb_participants: optionalNonNegativeInt(
    "Number of participants must be 0 or greater.",
    100_000,
    "Number of participants must be at most 100,000."
  ),
  number_of_sessions: optionalPositiveInt(
    "Number of sessions must be at least 1.",
    1000,
    "Number of sessions must be at most 1000."
  ),
  price: optionalNonNegativeNumber(
    "Price must be 0 or greater.",
    1_000_000,
    "Price must be at most 1,000,000."
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
