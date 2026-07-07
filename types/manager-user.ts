import type { RoleValue } from "@/lib/constants/roles";

export interface ManagerUserRow {
  id: string;
  username: string | null;
  role: RoleValue;
  created_at: string;
  email: string;
}
