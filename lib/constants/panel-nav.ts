import { ROUTES } from "@/lib/constants/routes";
import type { PanelNavItem } from "@/types/panel";

/** Serializable nav config (safe to pass from Server Components). */
export const ADMIN_PANEL_NAV: PanelNavItem[] = [
  {
    title: "Dashboard",
    href: ROUTES.ADMIN_DASHBOARD,
    icon: "layout-dashboard",
  },
];
