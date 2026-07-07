import { ROLE_VALUES, type RoleValue } from "@/lib/constants/roles";

export const MANAGER_USER_ROLE_LABELS: Record<RoleValue, string> = {
  admin: "Admin",
  manager: "Manager",
  ceo: "CEO",
  teacher: "Teacher",
  student: "Student",
};

export const MANAGER_USER_ROLE_BADGE_CLASSES: Record<RoleValue, string> = {
  student: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  teacher: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  manager: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  admin: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  ceo: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export const MANAGER_USER_EDITABLE_ROLES = ROLE_VALUES;
