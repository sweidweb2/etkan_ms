import {
  ADMIN_PANEL_NAVIGATION,
  CEO_PANEL_NAVIGATION,
  CO_MANAGER_PANEL_NAVIGATION,
  CRM_PANEL_NAVIGATION,
  MANAGER_PANEL_NAVIGATION,
  STUDENT_PANEL_NAVIGATION,
  SUPERVISOR_PANEL_NAVIGATION,
  TEACHER_PANEL_NAVIGATION,
  TRAINER_PANEL_NAVIGATION,
} from "@/lib/constants/panel-nav";
import {
  NOTIFICATION_AUDIENCE_LABELS,
  type NotificationAudienceValue,
} from "@/lib/constants/manager-notification-display";
import type { PanelNavigation } from "@/types/panel";

export const NOTIFICATION_ACTION_NONE_VALUE = "__none__";

export type NotificationActionPage = {
  label: string;
  href: string;
};

function flattenPanelNavigation(
  navigation: PanelNavigation
): NotificationActionPage[] {
  const items = [
    ...(navigation.items ?? []),
    ...(navigation.groups?.flatMap((group) => group.items) ?? []),
  ];

  return items
    .filter((item) => !item.href.includes("["))
    .map((item) => ({
      label: item.title,
      href: item.href,
    }));
}

const NOTIFICATION_ACTION_PAGES_BY_AUDIENCE: Record<
  Exclude<NotificationAudienceValue, "all">,
  NotificationActionPage[]
> = {
  admin: flattenPanelNavigation(ADMIN_PANEL_NAVIGATION),
  manager: flattenPanelNavigation(MANAGER_PANEL_NAVIGATION),
  "co-manager": flattenPanelNavigation(CO_MANAGER_PANEL_NAVIGATION),
  ceo: flattenPanelNavigation(CEO_PANEL_NAVIGATION),
  supervisor: flattenPanelNavigation(SUPERVISOR_PANEL_NAVIGATION),
  crm: flattenPanelNavigation(CRM_PANEL_NAVIGATION),
  teacher: flattenPanelNavigation(TEACHER_PANEL_NAVIGATION),
  trainer: flattenPanelNavigation(TRAINER_PANEL_NAVIGATION),
  student: flattenPanelNavigation(STUDENT_PANEL_NAVIGATION),
};

export function getNotificationActionPagesForAudience(
  audience: NotificationAudienceValue
): NotificationActionPage[] {
  if (audience === "all") {
    return (
      Object.keys(NOTIFICATION_ACTION_PAGES_BY_AUDIENCE) as Array<
        Exclude<NotificationAudienceValue, "all">
      >
    ).flatMap((audienceKey) =>
      NOTIFICATION_ACTION_PAGES_BY_AUDIENCE[audienceKey].map((page) => ({
        label: `${NOTIFICATION_AUDIENCE_LABELS[audienceKey]} · ${page.label}`,
        href: page.href,
      }))
    );
  }

  return NOTIFICATION_ACTION_PAGES_BY_AUDIENCE[audience];
}

export function isNotificationActionHrefValidForAudience(
  audience: NotificationAudienceValue,
  actionHref: string | undefined
): boolean {
  if (!actionHref || actionHref === NOTIFICATION_ACTION_NONE_VALUE) {
    return true;
  }

  return getNotificationActionPagesForAudience(audience).some(
    (page) => page.href === actionHref
  );
}
