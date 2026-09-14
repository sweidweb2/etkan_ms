import type { FieldErrors } from "@/types/auth";

export type ManagerCategoryRow = {
  id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
};

export type CreateCategoryActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  category?: ManagerCategoryRow;
};

export type UpdateCategoryActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  category?: ManagerCategoryRow;
};

export type DeleteCategoryActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};
