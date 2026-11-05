import type { PanelNavItem } from "@/types/panel";

/** Longest-href match so nested routes resolve to their own item, not a parent. */
export function resolveActivePanelNavItem(
  pathname: string,
  items: readonly PanelNavItem[]
): PanelNavItem | null {
  let best: PanelNavItem | null = null;
  for (const item of items) {
    const matches =
      pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (!matches) continue;
    if (!best || item.href.length > best.href.length) {
      best = item;
    }
  }
  return best;
}
