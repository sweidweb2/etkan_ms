import type { RoleValue } from "@/lib/constants/roles";
import type { FieldErrors } from "@/types/auth";

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

export type ManagerMentorSubjectColumn = {
  id: string;
  name: string;
  sort_order: number;
};

export type ManagerInstructorCapabilityPair = {
  user_id: string;
  mentor_subject_id: string;
};

export type ManagerInstructorsPageData = {
  instructors: ManagerInstructorRow[];
  candidateUsers: ManagerInstructorCandidateRow[];
  mentorSubjects: ManagerMentorSubjectColumn[];
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

export type CreateMentorSubjectActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  mentorSubject?: ManagerMentorSubjectColumn;
};

export type UpdateMentorSubjectActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  mentorSubject?: ManagerMentorSubjectColumn;
};

export type DeleteMentorSubjectActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  mentorSubjectId?: string;
};

export type SaveMentorSubjectOrderActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  mentorSubjects?: ManagerMentorSubjectColumn[];
};
