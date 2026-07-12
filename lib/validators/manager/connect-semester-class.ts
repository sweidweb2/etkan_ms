import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const connectSemesterClassSchema = z.object({
  classId: z
    .string()
    .trim()
    .min(1, { message: "Select a class to connect." }),
});

export type ConnectSemesterClassInput = z.infer<
  typeof connectSemesterClassSchema
>;

export function parseConnectSemesterClassFormData(formData: FormData):
  | { success: true; data: ConnectSemesterClassInput & { semester_id: string } }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const semester_id = String(formData.get("semester_id") ?? "").trim();

  if (!semester_id) {
    return { success: false, error: "Semester is required." };
  }

  const parsed = connectSemesterClassSchema.safeParse({
    classId: formData.get("classId"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return {
    success: true,
    data: {
      semester_id,
      ...parsed.data,
    },
  };
}
