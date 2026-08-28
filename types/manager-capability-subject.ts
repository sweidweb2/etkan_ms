import type { SubjectScope } from "@/lib/constants/subject-scope";
import type { FieldErrors } from "@/types/auth";

/**
 * Instructor and mentor capability catalogs. Distinct from academic subjects
 * (`types/manager-subject.ts`) — these only drive the capability matrices.
 */
export type ManagerSubjectColumn = {
  id: string;
  name: string;
  sort_order: number;
};

/** One enabled cell of a scoped capability matrix. */
export type ManagerSubjectCapabilityPair = {
  user_id: string;
  subject_id: string;
};

/** Catalog plus matrix for one scope. */
export type ManagerSubjectScopeData = {
  subjects: ManagerSubjectColumn[];
  capabilities: ManagerSubjectCapabilityPair[];
};

export type SetSubjectCapabilityResult = {
  success: boolean;
  error?: string;
  message?: string;
  scope?: SubjectScope;
  user_id?: string;
  subject_id?: string;
  enabled?: boolean;
};

export type CreateSubjectActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  subject?: ManagerSubjectColumn;
};

export type UpdateSubjectActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  subject?: ManagerSubjectColumn;
};

export type DeleteSubjectActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  subjectId?: string;
};

export type SaveSubjectOrderActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  subjects?: ManagerSubjectColumn[];
};
