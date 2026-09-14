import { z } from "zod";
import { formValidationFailure } from "@/lib/validators/safe-parse-form-data";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const createClassSessionSchema = z
  .object({
    topic: z
      .string()
      .trim()
      .min(1, { message: "Session topic is required." })
      .max(120, { message: "Topic must be at most 120 characters." }),
    session_report: z
      .string()
      .trim()
      .max(5000, {
        message: "Session report must be at most 5000 characters.",
      })
      .optional(),
    starts_at: z
      .string()
      .trim()
      .min(1, { message: "Start date and time are required." }),
    ends_at: z
      .string()
      .trim()
      .min(1, { message: "End date and time are required." }),
  })
  .refine(
    (values) => {
      const startsAt = new Date(values.starts_at);
      const endsAt = new Date(values.ends_at);

      return (
        !Number.isNaN(startsAt.getTime()) &&
        !Number.isNaN(endsAt.getTime()) &&
        endsAt > startsAt
      );
    },
    {
      message: "End must be after start.",
      path: ["ends_at"],
    }
  );

export type CreateClassSessionInput = z.infer<typeof createClassSessionSchema>;

export function parseCreateClassSessionFormData(formData: FormData):
  | {
      success: true;
      data: CreateClassSessionInput & { class_id: string };
    }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const class_id = String(formData.get("class_id") ?? "").trim();

  if (!class_id) {
    return { success: false, error: "Class is required." };
  }

  const parsed = createClassSessionSchema.safeParse({
    topic: formData.get("topic"),
    session_report: formData.get("session_report") ?? undefined,
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at"),
  });

  if (!parsed.success) {
    return formValidationFailure(zodFieldErrors(parsed.error.flatten().fieldErrors));
  }

  return {
    success: true,
    data: {
      class_id,
      ...parsed.data,
    },
  };
}
