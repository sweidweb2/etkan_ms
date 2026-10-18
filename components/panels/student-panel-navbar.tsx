"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { AppLogo } from "@/components/brand/app-logo";
import { PANEL_ICONS } from "@/components/panels/panel-icons";
import { PanelNotificationsBell } from "@/components/panels/panel-notifications-bell";
import { PanelUserMenu } from "@/components/panels/panel-user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { PERMISSIONS, type PermissionKey } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import { flattenPanelNavItems } from "@/lib/panels/flatten-nav";
import { cn } from "@/lib/utils";
import type { PanelNavigation } from "@/types/panel";

type StudentPanelNavbarProps = {
  navigation: PanelNavigation;
  displayName: string;
  permissions?: readonly PermissionKey[];
};

function matchesNavHref(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

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

export function StudentPanelNavbar({
  navigation,
  displayName,
  permissions = [],
}: StudentPanelNavbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = flattenPanelNavItems(navigation);
  const activeHref = resolveActiveNavHref(
    pathname,
    items.map((item) => item.href)
  );
  const canViewNotifications = permissions.includes(
    PERMISSIONS.NOTIFICATIONS_VIEW
  );

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="w-full shrink-0 border-b border-border bg-background">
      <div className="relative flex h-14 w-full items-center px-4 md:px-6">
        <Link
          href={ROUTES.STUDENT_ROOT}
          prefetch={false}
          aria-label="Student home"
          className="relative z-10 shrink-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={closeMenu}
        >
          <AppLogo tone="auto" height={22} priority />
        </Link>

        <nav
          aria-label="Student"
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex"
        >
          {items.map((item) => (
            <StudentNavLink
              key={item.href}
              href={item.href}
              title={item.title}
              icon={item.icon}
              isActive={item.href === activeHref}
            />
          ))}
        </nav>

        <div className="relative z-10 ml-auto flex items-center gap-1">
          {canViewNotifications ? <PanelNotificationsBell /> : null}
          <ThemeToggle />
          <PanelUserMenu displayName={displayName} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-expanded={menuOpen}
            aria-controls="student-panel-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {menuOpen ? (
        <nav
          id="student-panel-menu"
          aria-label="Student"
          className="flex w-full flex-col gap-1 border-t border-border px-3 py-2 md:hidden"
        >
          {items.map((item) => (
            <StudentNavLink
              key={item.href}
              href={item.href}
              title={item.title}
              icon={item.icon}
              isActive={item.href === activeHref}
              onNavigate={closeMenu}
            />
          ))}
        </nav>
      ) : null}
    </header>
  );
}

function StudentNavLink({
  href,
  title,
  icon,
  isActive,
  onNavigate,
}: {
  href: string;
  title: string;
  icon: keyof typeof PANEL_ICONS;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const Icon = PANEL_ICONS[icon];

  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={isActive ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium outline-none transition-colors",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>{title}</span>
    </Link>
  );
}
