"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutTemplateIcon, UserIcon } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

const SETTINGS_NAV = [
  {
    href: ROUTES.TEACHER_SETTINGS_MY_INFO,
    label: "My info",
    icon: UserIcon,
  },
  {
    href: ROUTES.TEACHER_SETTINGS_LAYOUT,
    label: "Layout",
    icon: LayoutTemplateIcon,
  },
] as const;

type TeacherSettingsShellProps = {
  children: React.ReactNode;
};

export function TeacherSettingsShell({ children }: TeacherSettingsShellProps) {
  const pathname = usePathname();
  const activeItem =
    SETTINGS_NAV.find((item) => pathname === item.href) ?? SETTINGS_NAV[0];

  return (
    <div className="flex w-full flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.TEACHER_CLASSES} prefetch={false}>
              My classes
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile and how class pages look.
        </p>
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <aside className="w-full shrink-0 md:w-52">
          <nav
            aria-label="Settings"
            className="flex flex-row gap-1 overflow-x-auto rounded-xl border border-border/80 bg-card p-1 md:flex-col"
          >
            {SETTINGS_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === activeItem.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                    "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
