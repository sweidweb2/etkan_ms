import type { FieldErrors } from "@/types/auth";

export interface ManagerRelationshipRow {
  id: string;
  name: string;
  phone: string | null;
  relation_with: string | null;
  major: string | null;
  speciality: string | null;
  is_useful: boolean;
  created_at: string;
}

export type CreateRelationshipActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  relationship?: ManagerRelationshipRow;
};

export type UpdateRelationshipActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  relationship?: ManagerRelationshipRow;
};
