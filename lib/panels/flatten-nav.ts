import type { PanelNavItem, PanelNavigation } from "@/types/panel";

export function flattenPanelNavItems(
  navigation: PanelNavigation
): PanelNavItem[] {
  return [
    ...(navigation.items ?? []),
    ...(navigation.groups?.flatMap((group) => group.items) ?? []),
  ];
}
