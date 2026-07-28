import type { FieldErrors } from "@/types/auth";

export type SendManagerEmailActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  sentCount?: number;
  skippedCount?: number;
  failedCount?: number;
};
