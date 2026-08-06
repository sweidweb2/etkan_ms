import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const createGalleryImageSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required." })
    .max(200, { message: "Name must be at most 200 characters." }),
  direct_url: z
    .string()
    .trim()
    .min(1, { message: "Direct URL is required." })
    .url({ message: "Enter a valid URL." })
    .max(2000, { message: "Direct URL must be at most 2000 characters." }),
});

export type CreateGalleryImageInput = z.infer<typeof createGalleryImageSchema>;

export function parseCreateGalleryImageFormData(formData: FormData):
  | { success: true; data: CreateGalleryImageInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createGalleryImageSchema.safeParse({
    name: formData.get("name"),
    direct_url: formData.get("direct_url"),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(flattened),
    };
  }

  return { success: true, data: parsed.data };
}
