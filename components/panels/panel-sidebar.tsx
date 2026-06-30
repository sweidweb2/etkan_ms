"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { PANEL_ICONS } from "@/components/panels/panel-icons";
import { SITE } from "@/lib/config/site";
import type { PanelNavItem, PanelVariant } from "@/types/panel";

type PanelSidebarProps = {
  variant: PanelVariant;
  label: string;
  navItems: PanelNavItem[];
};

export function PanelSidebar({ variant, label, navItems }: PanelSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="group-data-[collapsible=icon]:hidden">
        <div className="flex flex-col gap-0.5 px-2 py-1">
          <span className="text-xs font-medium uppercase tracking-wide text-sidebar-foreground/70">
            {SITE.name}
          </span>
          <span className="text-sm font-semibold text-sidebar-foreground">
            {label}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
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
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex w-full justify-center px-2 pb-2 group-data-[collapsible=icon]:px-0">
          <SignOutButton />
        </div>
        <p className="px-2 pb-2 text-center text-xs capitalize text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
          {variant} panel
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
