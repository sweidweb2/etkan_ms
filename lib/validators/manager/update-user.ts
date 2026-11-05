import { z } from "zod";
import { formValidationFailure } from "@/lib/validators/safe-parse-form-data";
import { MANAGER_USER_EDITABLE_ROLES } from "@/lib/constants/manager-user-display";
import { STUDENT_STATUS_VALUES } from "@/lib/constants/manager-student-status";
import { ROLES } from "@/lib/constants/roles";
import {
  birthDateField,
  emailField,
  fullNameField,
  phoneField,
} from "@/lib/validators/auth/fields";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import {
  addOptionalPasswordPairIssues,
  optionalPasswordInput,
} from "@/lib/validators/auth/optional-created-password";
import type { FieldErrors } from "@/types/auth";

export const updateManagerUserSchema = z
  .object({
    fullName: fullNameField,
    email: emailField,
    role: z.enum(MANAGER_USER_EDITABLE_ROLES, {
      message: "Please select a role.",
    }),
    is_instructor: z.boolean(),
    birthDate: birthDateField,
    phone: phoneField,
    status: z
      .enum(STUDENT_STATUS_VALUES, {
        message: "Please select a status.",
      })
      .optional(),
    password: optionalPasswordInput,
    confirmPassword: optionalPasswordInput,
  })
  .superRefine((values, ctx) => {
    addOptionalPasswordPairIssues(values, ctx);

    if (values.role !== ROLES.STUDENT) {
      return;
    }

    if (!values.status) {
      ctx.addIssue({
        code: "custom",
        message: "Please select a status.",
        path: ["status"],
      });
    }
  });

export type UpdateManagerUserInput = z.infer<typeof updateManagerUserSchema>;

export function parseUpdateManagerUserFormData(formData: FormData):
  | {
      success: true;
      data: UpdateManagerUserInput & {
        userId: string;
      };
    }
  | {
      success: false;
      error: string;
      fieldErrors?: FieldErrors;
    } {
  const userId = String(formData.get("userId") ?? "").trim();

  if (!userId) {
    return {
      success: false,
      error: "Unable to update user. Please refresh and try again.",
    };
  }

  const parsed = updateManagerUserSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    role: formData.get("role"),
    is_instructor: formData.get("is_instructor") === "true",
    birthDate: formData.get("birthDate") ?? "",
    phone: formData.get("phone") ?? "",
    status: formData.get("status") || undefined,
    password: formData.get("password") ?? "",
    confirmPassword: formData.get("confirmPassword") ?? "",
  });

  if (!parsed.success) {
    return formValidationFailure(zodFieldErrors(parsed.error.flatten().fieldErrors));
  }

  return {
    success: true,
    data: {
      ...parsed.data,
      userId,
    },
  };
}
