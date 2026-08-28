import type { RoleValue } from "@/lib/constants/roles";

export type ManagerMentorRow = {
  id: string;
  username: string | null;
  role: RoleValue;
  email: string;
  created_at: string;
};

export type ManagerMentorCandidateRow = {
  id: string;
  username: string | null;
  role: RoleValue;
  email: string;
};

export type RemoveMentorActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  userId?: string;
};

export type AddMentorsActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  addedCount?: number;
};
