"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLogo } from "@/components/brand/app-logo";
import { PANEL_ICONS } from "@/components/panels/panel-icons";
import { PanelNotificationsBell } from "@/components/panels/panel-notifications-bell";
import { PanelUserMenu } from "@/components/panels/panel-user-menu";
import { TeacherPanelSearch } from "@/components/panels/teacher-panel-search";
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
  homeHref?: string;
  homeLabel?: string;
  navLabel?: string;
  menuId?: string;
  settingsHref?: string;
  /** Replace center nav links with teacher page/class search. */
  showTeacherSearch?: boolean;
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
  homeHref = ROUTES.STUDENT_ROOT,
  homeLabel = "Student home",
  navLabel = "Student",
  menuId = "student-panel-menu",
  settingsHref,
  showTeacherSearch = false,
}: StudentPanelNavbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = flattenPanelNavItems(navigation);
  const activeHref = resolveActiveNavHref(
    pathname,
    items.filter((item) => !item.locked).map((item) => item.href)
  );
  const canViewNotifications = permissions.includes(
    PERMISSIONS.NOTIFICATIONS_VIEW
  );
  const showLinkNav = items.length > 0;

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="w-full shrink-0 border-b border-border bg-background">
      <div className="relative flex h-14 w-full items-center px-4 md:px-6">
        <Link
          href={homeHref}
          prefetch={false}
          aria-label={homeLabel}
          className="relative z-10 shrink-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={closeMenu}
        >
          <AppLogo tone="auto" height={22} priority />
        </Link>

        {showTeacherSearch ? (
          <div className="absolute left-1/2 hidden w-[min(100%,28rem)] -translate-x-1/2 items-center gap-2 px-2 md:flex">
            {showLinkNav ? (
              <nav
                aria-label={navLabel}
                className="hidden shrink-0 items-center gap-1 lg:flex"
              >
                {items.map((item) => (
                  <StudentNavLink
                    key={item.href}
                    href={item.href}
                    title={item.title}
                    icon={item.icon}
                    isActive={item.href === activeHref}
                    locked={item.locked}
                    lockedMessage={item.lockedMessage}
                  />
                ))}
              </nav>
            ) : null}
            <TeacherPanelSearch className="min-w-0 flex-1" />
          </div>
        ) : showLinkNav ? (
          <nav
            aria-label={navLabel}
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex"
          >
            {items.map((item) => (
              <StudentNavLink
                key={item.href}
                href={item.href}
                title={item.title}
                icon={item.icon}
                isActive={item.href === activeHref}
                locked={item.locked}
                lockedMessage={item.lockedMessage}
              />
            ))}
          </nav>
        ) : null}

        <div className="relative z-10 ml-auto flex items-center gap-1">
          {canViewNotifications ? <PanelNotificationsBell /> : null}
          <ThemeToggle />
          <PanelUserMenu
            displayName={displayName}
            settingsHref={settingsHref}
          />
          {showLinkNav || showTeacherSearch ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X /> : <Menu />}
            </Button>
          ) : null}
        </div>
      </div>

      {menuOpen && (showTeacherSearch || showLinkNav) ? (
        <div
          id={menuId}
          className="flex w-full flex-col gap-2 border-t border-border px-3 py-2 md:hidden"
        >
          {showTeacherSearch ? <TeacherPanelSearch /> : null}
          {showLinkNav ? (
            <nav aria-label={navLabel} className="flex flex-col gap-1">
              {items.map((item) => (
                <StudentNavLink
                  key={item.href}
                  href={item.href}
                  title={item.title}
                  icon={item.icon}
                  isActive={item.href === activeHref}
                  locked={item.locked}
                  lockedMessage={item.lockedMessage}
                  onNavigate={closeMenu}
                />
              ))}
            </nav>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

function StudentNavLink({
  href,
  title,
  icon,
  isActive,
  locked = false,
  lockedMessage = "Coming soon",
  onNavigate,
}: {
  href: string;
  title: string;
  icon: keyof typeof PANEL_ICONS;
  isActive: boolean;
  locked?: boolean;
  lockedMessage?: string;
  onNavigate?: () => void;
}) {
  const Icon = PANEL_ICONS[icon];
  const [lockedNotice, setLockedNotice] = useState(0);

  useEffect(() => {
    if (lockedNotice === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLockedNotice(0);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [lockedNotice]);

  const itemClassName = cn(
    "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium outline-none transition-colors",
    "focus-visible:ring-3 focus-visible:ring-ring/50",
    isActive
      ? "bg-primary text-primary-foreground"
      : "text-foreground hover:bg-accent hover:text-accent-foreground"
  );

  if (locked) {
    return (
      <div className="relative">
        <button
          type="button"
          aria-disabled="true"
          onClick={() => setLockedNotice((current) => current + 1)}
          className={cn(
            itemClassName,
            "cursor-default text-muted-foreground hover:bg-transparent hover:text-muted-foreground"
          )}
        >
          <Icon className="size-4 shrink-0" aria-hidden />
          <span>{title}</span>
          <Lock className="size-3.5 shrink-0" aria-hidden />
        </button>
        {lockedNotice > 0 ? (
          <p
            role="status"
            className="absolute top-full left-1/2 z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-sm"
          >
            {lockedMessage}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={isActive ? "page" : undefined}
      onClick={onNavigate}
      className={itemClassName}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>{title}</span>
    </Link>
  );
}
