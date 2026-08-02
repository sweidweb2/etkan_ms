import type { RoleValue } from "@/lib/constants/roles";

export type ManagerInstructorRow = {
  id: string;
  username: string | null;
  role: RoleValue;
  email: string;
  created_at: string;
};

export type ManagerInstructorCandidateRow = {
  id: string;
  username: string | null;
  role: RoleValue;
  email: string;
};

export type ManagerInstructorSubjectColumn = {
  id: string;
  name: string;
};

export type ManagerInstructorCapabilityPair = {
  user_id: string;
  subject_id: string;
};

export type ManagerInstructorsPageData = {
  instructors: ManagerInstructorRow[];
  candidateUsers: ManagerInstructorCandidateRow[];
  subjects: ManagerInstructorSubjectColumn[];
  capabilities: ManagerInstructorCapabilityPair[];
};

export type SaveInstructorCapabilitiesActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  capabilities?: ManagerInstructorCapabilityPair[];
};

export type RemoveInstructorActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  userId?: string;
};

export type AddInstructorsActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  addedCount?: number;
};
