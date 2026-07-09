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

export function PanelNavMenu({ items }: PanelNavMenuProps) {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = PANEL_ICONS[item.icon];

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              isActive={isActive}
              render={<Link href={item.href} />}
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
  return group.items.some(
    (item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
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
          "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left",
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
