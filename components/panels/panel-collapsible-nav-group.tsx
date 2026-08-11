"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { PANEL_ICONS } from "@/components/panels/panel-icons";
import type { PanelNavGroup, PanelNavItem } from "@/types/panel";
import { cn } from "@/lib/utils";

type PanelNavMenuProps = {
  items: PanelNavItem[];
};

function matchesNavHref(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Prefer the longest matching href so nested routes don't highlight parents. */
function resolveActiveNavHref(
  pathname: string,
  hrefs: readonly string[]
): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    if (!matchesNavHref(pathname, href)) continue;
    if (!best || href.length > best.length) {
      best = href;
    }
  }
  return best;
}

export function PanelNavMenu({ items }: PanelNavMenuProps) {
  const pathname = usePathname();
  const activeHref = resolveActiveNavHref(
    pathname,
    items.map((item) => item.href)
  );

  return (
    <SidebarMenu>
      {items.map((item) => {
        const isActive = item.href === activeHref;
        const Icon = PANEL_ICONS[item.icon];

        return (
          <SidebarMenuItem
            key={item.href}
            className="mx-1 group-data-[collapsible=icon]:mx-0"
          >
            <SidebarMenuButton
              isActive={isActive}
              render={(props) => (
                <Link {...props} href={item.href} prefetch={false} />
              )}
            >
              <Icon />
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

type PanelCollapsibleNavGroupProps = {
  group: PanelNavGroup;
  panelVariant: string;
};

function groupContainsPath(group: PanelNavGroup, pathname: string): boolean {
  return group.items.some((item) => matchesNavHref(pathname, item.href));
}

export function PanelCollapsibleNavGroup({
  group,
  panelVariant,
}: PanelCollapsibleNavGroupProps) {
  const pathname = usePathname();
  const contentId = useId();
  const { state, isMobile } = useSidebar();
  const isIconCollapsed = state === "collapsed" && !isMobile;
  const hasActiveChild = groupContainsPath(group, pathname);

  const [isOpen, setIsOpen] = useState(group.defaultOpen ?? true);
  const effectiveIsOpen = isOpen || hasActiveChild;

  if (isIconCollapsed) {
    return (
      <SidebarGroup className="py-0">
        <SidebarGroupContent>
          <PanelNavMenu items={group.items} />
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup className="py-0">
      <button
        type="button"
        aria-expanded={effectiveIsOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "mx-1 flex items-center justify-between rounded-md px-2 py-1.5 text-left",
          "text-xs font-medium text-sidebar-foreground/70",
          "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
          "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-hidden",
          "transition-colors duration-200"
        )}
      >
        <SidebarGroupLabel className="h-auto px-0 py-0">{group.label}</SidebarGroupLabel>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-sidebar-foreground/60 transition-transform duration-200 ease-in-out",
            effectiveIsOpen && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      <div
        id={contentId}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-in-out",
          effectiveIsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
        data-panel-group={group.id}
        data-panel-variant={panelVariant}
      >
        <div className="overflow-hidden">
          <SidebarGroupContent className="pt-1">
            <PanelNavMenu items={group.items} />
          </SidebarGroupContent>
        </div>
      </div>
    </SidebarGroup>
  );
}
