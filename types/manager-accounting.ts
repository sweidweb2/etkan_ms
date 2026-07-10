import type { FieldErrors } from "@/types/auth";

export type AccountingMutationActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
};
