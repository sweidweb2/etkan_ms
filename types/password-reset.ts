import type { RoleValue } from "@/lib/constants/roles";
import type { FieldErrors } from "@/types/auth";

export type PasswordResetExportRow = {
  username: string;
  email: string;
  role: string;
  password: string;
};

export type PasswordResetUserOption = {
  id: string;
  username: string;
  email: string;
  role: RoleValue;
};

export type PasswordResetFailureResult = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};
