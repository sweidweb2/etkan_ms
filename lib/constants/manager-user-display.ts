import { ROLE_VALUES, type RoleValue } from "@/lib/constants/roles";

export const MANAGER_USER_ROLE_LABELS: Record<RoleValue, string> = {
  admin: "Admin",
  manager: "Manager",
  "co-manager": "Co-manager",
  ceo: "CEO",
  supervisor: "Supervisor",
  crm: "CRM",
  teacher: "Teacher",
  trainer: "Trainer",
  student: "Student",
};

export const MANAGER_USER_ROLE_BADGE_CLASSES: Record<RoleValue, string> = {
  student: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  teacher: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  trainer: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  manager: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  "co-manager": "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  admin: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  ceo: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  supervisor: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  crm: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
};

export const MANAGER_USER_EDITABLE_ROLES = ROLE_VALUES;
