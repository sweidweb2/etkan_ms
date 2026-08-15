import type { FieldErrors } from "@/types/auth";
import type { PublicProjectClassificationValue } from "@/lib/constants/manager-public-project";

export interface ManagerPublicProjectRow {
  id: string;
  classification: PublicProjectClassificationValue;
  category: string;
  title: string;
  body: string;
  image_url: string;
  href: string | null;
  created_at: string;
  updated_at: string;
}

export type CreatePublicProjectActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  project?: ManagerPublicProjectRow;
};

export type UpdatePublicProjectActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  project?: ManagerPublicProjectRow;
};

export type DeletePublicProjectActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};
