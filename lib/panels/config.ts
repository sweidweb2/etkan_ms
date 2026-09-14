import { ROLES, type RoleValue } from "@/lib/constants/roles";
import {
  ADMIN_PANEL_NAVIGATION,
  CEO_PANEL_NAVIGATION,
  CO_MANAGER_PANEL_NAVIGATION,
  CRM_PANEL_NAVIGATION,
  MANAGER_PANEL_NAVIGATION,
  STUDENT_PANEL_NAVIGATION,
  SUPERVISOR_PANEL_NAVIGATION,
  TEACHER_PANEL_NAVIGATION,
} from "@/lib/constants/panel-nav";
import type { PanelConfig, PanelVariant } from "@/types/panel";

const PANEL_CONFIG_BY_ROLE: Record<RoleValue, PanelConfig> = {
  [ROLES.ADMIN]: {
    variant: "admin",
    label: "Admin",
    navigation: ADMIN_PANEL_NAVIGATION,
  },
  [ROLES.MANAGER]: {
    variant: "manager",
    label: "Manager",
    navigation: MANAGER_PANEL_NAVIGATION,
  },
  [ROLES.CO_MANAGER]: {
    variant: "co-manager",
    label: "Co-manager",
    navigation: CO_MANAGER_PANEL_NAVIGATION,
  },
  [ROLES.CEO]: {
    variant: "ceo",
    label: "CEO",
    navigation: CEO_PANEL_NAVIGATION,
  },
  [ROLES.SUPERVISOR]: {
    variant: "supervisor",
    label: "Supervisor",
    navigation: SUPERVISOR_PANEL_NAVIGATION,
  },
  [ROLES.CRM]: {
    variant: "crm",
    label: "CRM",
    navigation: CRM_PANEL_NAVIGATION,
  },
  [ROLES.TEACHER]: {
    variant: "teacher",
    label: "Teacher",
    navigation: TEACHER_PANEL_NAVIGATION,
  },
  [ROLES.STUDENT]: {
    variant: "student",
    label: "Student",
    navigation: STUDENT_PANEL_NAVIGATION,
  },
};

export function getPanelConfigForRole(role: RoleValue): PanelConfig {
  return PANEL_CONFIG_BY_ROLE[role];
}

export function isPanelVariant(value: string): value is PanelVariant {
  return (
    value === "admin" ||
    value === "manager" ||
    value === "co-manager" ||
    value === "ceo" ||
    value === "supervisor" ||
    value === "crm" ||
    value === "teacher" ||
    value === "student"
  );
}
