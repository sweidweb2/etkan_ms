import { ROUTES } from "@/lib/constants/routes";
import type { ManagerDashboardQuickAction } from "@/types/manager-dashboard";

export const MANAGER_DASHBOARD_QUICK_ACTIONS: ManagerDashboardQuickAction[] = [
  {
    label: "Manage students",
    description: "Review enrollments, attendance, and performance.",
    href: ROUTES.MANAGER_STUDENTS,
  },
  {
    label: "Manage subjects",
    description: "Open subject details, classes, and grade summaries.",
    href: ROUTES.MANAGER_SUBJECTS,
  },
  {
    label: "Manage relationships",
    description: "Keep parent and guardian records up to date.",
    href: ROUTES.MANAGER_RELATIONSHIPS,
  },
  {
    label: "Open schedule",
    description: "Check today's classes, rooms, and teacher assignments.",
    href: ROUTES.MANAGER_SCHEDULE,
  },
];
