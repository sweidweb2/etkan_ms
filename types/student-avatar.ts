import type { FieldErrors } from "@/types/auth";

export type AvatarActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  avatar_url?: string | null;
};
