import type { SubjectScope } from "@/lib/constants/subject-scope";

/**
 * Academic subjects shown as columns on a capability matrix.
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
