import type { RoleValue } from "@/lib/constants/roles";
import type {
  ManagerSubjectCapabilityPair,
  ManagerSubjectColumn,
} from "@/types/manager-capability-subject";

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

export type ManagerInstructorsPageData = {
  instructors: ManagerInstructorRow[];
  candidateUsers: ManagerInstructorCandidateRow[];
  subjects: ManagerSubjectColumn[];
  capabilities: ManagerSubjectCapabilityPair[];
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