import { ROUTES } from "@/lib/constants/routes";
import type { PanelNavGroup, PanelNavigation } from "@/types/panel";

/** Sidebar topic group injected into role panels when `is_instructor`. */
export const INSTRUCTOR_SIDEBAR_NAV_GROUP: PanelNavGroup = {
  id: "instructor",
  label: "Instructor",
  defaultOpen: true,
  items: [
    {
      title: "Overview",
      href: ROUTES.INSTRUCTOR_DASHBOARD,
      icon: "layout-dashboard",
    },
    {
      title: "My schedule",
      href: ROUTES.INSTRUCTOR_SCHEDULE,
      icon: "calendar-days",
    },
    {
      title: "My workshops",
      href: ROUTES.INSTRUCTOR_WORKSHOPS,
      icon: "presentation",
    },
    {
      title: "My sessions",
      href: ROUTES.INSTRUCTOR_SESSIONS,
      icon: "book-open",
    },
    {
      title: "Capabilities",
      href: ROUTES.INSTRUCTOR_CAPABILITIES,
      icon: "library",
    },
  ],
};

/**
 * Add the Instructor topic group to a role sidebar (CEO, student, manager, …).
 */
export function withInstructorNavGroup(
  navigation: PanelNavigation
): PanelNavigation {
  const groups = navigation.groups ?? [];
  if (groups.some((group) => group.id === INSTRUCTOR_SIDEBAR_NAV_GROUP.id)) {
    return navigation;
  }

  return {
    ...navigation,
    groups: [INSTRUCTOR_SIDEBAR_NAV_GROUP, ...groups],
  };
}
