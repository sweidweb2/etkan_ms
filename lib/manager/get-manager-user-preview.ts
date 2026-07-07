import { MANAGER_USERS_MOCK } from "@/lib/constants/manager-users-mock";
import type { ManagerUserRow } from "@/types/manager-user";

/** Preview lookup until manager user details are backed by a service. */
export function getManagerUserPreview(userId: string): ManagerUserRow {
  return (
    MANAGER_USERS_MOCK.find((user) => user.id === userId) ??
    MANAGER_USERS_MOCK[0]
  );
}
