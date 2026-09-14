"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

const RBAC_TABS = [
  {
    href: ROUTES.MANAGER_RBAC,
    label: "Role permissions",
    match: (pathname: string) => pathname === ROUTES.MANAGER_RBAC,
  },
  {
    href: ROUTES.MANAGER_RBAC_PRIVATE,
    label: "Manage private",
    match: (pathname: string) =>
      pathname === ROUTES.MANAGER_RBAC_PRIVATE ||
      pathname.startsWith(`${ROUTES.MANAGER_RBAC_PRIVATE}/`),
  },
] as const;

export function RbacSectionNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Permissions sections"
      className="flex flex-wrap gap-1 rounded-lg border p-1"
    >
      {RBAC_TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch={false}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
