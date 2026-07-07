import { z } from "zod";
import { STUDENT_STATUS_VALUES } from "@/lib/constants/manager-student-status";
import {
  birthDateField,
  emailField,
  fullNameField,
  phoneField,
  usernameField,
} from "@/lib/validators/auth/fields";

export const updateStudentSchema = z.object({
  username: usernameField,
  fullName: fullNameField,
  email: emailField,
  birthDate: birthDateField,
  phone: phoneField,
  status: z.enum(STUDENT_STATUS_VALUES, {
    message: "Please select a status.",
  }),
});

export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
