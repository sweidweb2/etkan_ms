import { ROLES, type RoleValue } from "@/lib/constants/roles";
import {
  ADMIN_PANEL_NAV,
  CEO_PANEL_NAV,
  MANAGER_PANEL_NAV,
  STUDENT_PANEL_NAV,
  TEACHER_PANEL_NAV,
} from "@/lib/constants/panel-nav";
import type { PanelConfig, PanelVariant } from "@/types/panel";

const PANEL_CONFIG_BY_ROLE: Record<RoleValue, PanelConfig> = {
  [ROLES.ADMIN]: {
    variant: "admin",
    label: "Admin",
    navItems: ADMIN_PANEL_NAV,
  },
  [ROLES.MANAGER]: {
    variant: "manager",
    label: "Manager",
    navItems: MANAGER_PANEL_NAV,
  },
  [ROLES.CEO]: {
    variant: "ceo",
    label: "CEO",
    navItems: CEO_PANEL_NAV,
  },
  [ROLES.TEACHER]: {
    variant: "teacher",
    label: "Teacher",
    navItems: TEACHER_PANEL_NAV,
  },
  [ROLES.STUDENT]: {
    variant: "student",
    label: "Student",
    navItems: STUDENT_PANEL_NAV,
  },
};

export function getPanelConfigForRole(role: RoleValue): PanelConfig {
  return PANEL_CONFIG_BY_ROLE[role];
}

export function isPanelVariant(value: string): value is PanelVariant {
  return (
    value === "admin" ||
    value === "manager" ||
    value === "ceo" ||
    value === "teacher" ||
    value === "student"
  );
}
