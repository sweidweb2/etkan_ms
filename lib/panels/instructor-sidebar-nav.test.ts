import { describe, expect, it } from "vitest";
import {
  INSTRUCTOR_SIDEBAR_NAV_GROUP,
  withInstructorNavGroup,
} from "@/lib/panels/instructor-sidebar-nav";
import { ROUTES } from "@/lib/constants/routes";
import type { PanelNavigation } from "@/types/panel";

const baseNav: PanelNavigation = {
  items: [
    {
      title: "Dashboard",
      href: ROUTES.CEO_DASHBOARD,
      icon: "layout-dashboard",
    },
  ],
};

describe("withInstructorNavGroup", () => {
  it("prepends a single Instructor topic group", () => {
    const once = withInstructorNavGroup(baseNav);
    const twice = withInstructorNavGroup(once);

    expect(once.groups?.[0]).toEqual(INSTRUCTOR_SIDEBAR_NAV_GROUP);
    expect(once.groups).toHaveLength(1);
    expect(twice.groups).toHaveLength(1);
    expect(once.items).toEqual(baseNav.items);
  });
});
