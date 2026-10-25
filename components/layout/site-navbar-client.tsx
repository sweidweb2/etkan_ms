"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BriefcaseIcon,
  FolderKanbanIcon,
  HomeIcon,
  ImagesIcon,
  InfoIcon,
  NewspaperIcon,
} from "lucide-react";
import { AppLogo } from "@/components/brand/app-logo";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import type { MessageKey } from "@/lib/i18n/messages/en";
import { cn } from "@/lib/utils";

const PRIMARY_NAV_ITEMS: readonly {
  href: string;
  labelKey: MessageKey;
  shortLabelKey: MessageKey;
  icon: LucideIcon;
}[] = [
  {
    href: ROUTES.HOME,
    labelKey: "nav.home",
    shortLabelKey: "nav.home",
    icon: HomeIcon,
  },
  {
    href: ROUTES.ABOUT,
    labelKey: "nav.about",
    shortLabelKey: "nav.aboutShort",
    icon: InfoIcon,
  },
  {
    href: ROUTES.CAREERS,
    labelKey: "nav.careers",
    shortLabelKey: "nav.careersShort",
    icon: BriefcaseIcon,
  },
  {
    href: ROUTES.PROJECTS,
    labelKey: "nav.projects",
    shortLabelKey: "nav.projects",
    icon: FolderKanbanIcon,
  },
  {
    href: ROUTES.GALLERY,
    labelKey: "nav.gallery",
    shortLabelKey: "nav.gallery",
    icon: ImagesIcon,
  },
  {
    href: ROUTES.BLOGS,
    labelKey: "nav.blogs",
    shortLabelKey: "nav.blogs",
    icon: NewspaperIcon,
  },
];

function isNavActive(pathname: string, href: string): boolean {
  return (
    pathname === href ||
    (href !== ROUTES.HOME && pathname.startsWith(`${href}/`))
  );
}

function BrandNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = isNavActive(pathname, href);

  return (
    <Link
      href={href}
      suppressHydrationWarning
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}

function LoginNavLink({ className }: { className?: string }) {
  const { t } = usePublicI18n();
  const pathname = usePathname();
  const isActive = pathname === ROUTES.LOGIN;

  return (
    <Link
      href={ROUTES.LOGIN}
      suppressHydrationWarning
      aria-current={isActive ? "page" : undefined}
      className={cn(
        buttonVariants({ variant: "outline", size: "default" }),
        className
      )}
    >
      {t("nav.login")}
    </Link>
  );
}

function RegisterNavLink({ className }: { className?: string }) {
  const { t } = usePublicI18n();
  const pathname = usePathname();
  const isActive = pathname === ROUTES.REGISTER;

  return (
    <Link
      href={ROUTES.REGISTER}
      suppressHydrationWarning
      aria-current={isActive ? "page" : undefined}
      className={cn(buttonVariants({ variant: "default", size: "default" }), className)}
    >
      {t("nav.register")}
    </Link>
  );
}

function AuthNavActions({
  className,
  linkClassName,
}: {
  className?: string;
  linkClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LoginNavLink className={linkClassName} />
      <RegisterNavLink className={linkClassName} />
    </div>
  );
}

function PrimaryNavLinks({ className }: { className?: string }) {
  const { t } = usePublicI18n();

  return (
    <nav className={cn("flex items-center gap-1", className)} aria-label="Main">
      {PRIMARY_NAV_ITEMS.map((item) => (
        <BrandNavLink key={item.href} href={item.href}>
          {t(item.labelKey)}
        </BrandNavLink>
      ))}
    </nav>
  );
}

function MobileBottomNavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  const pathname = usePathname();
  const active = isNavActive(pathname, href);

  return (
    <Link
      href={href}
      suppressHydrationWarning
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium leading-tight transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

function MobileBottomNav() {
  const { t } = usePublicI18n();

  return (
    <nav
      aria-label={t("nav.navigate")}
      className={cn(
        "pointer-events-auto fixed inset-x-0 bottom-0 z-50 sm:hidden",
        "border-t border-border bg-white/95 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md",
        "pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      )}
      style={{ zIndex: 100 }}
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch gap-0.5 px-1.5 pt-1">
        {PRIMARY_NAV_ITEMS.map((item) => (
          <MobileBottomNavLink
            key={item.href}
            href={item.href}
            label={t(item.shortLabelKey)}
            icon={item.icon}
          />
        ))}
      </div>
    </nav>
  );
}

export function SiteNavbarClient() {
  const { t } = usePublicI18n();

  return (
    <>
      <header
        className="pointer-events-none fixed inset-x-0 top-0 z-50"
        style={{ zIndex: 100 }}
      >
        {/* Desktop / tablet bar */}
        <div className="flex justify-center max-sm:hidden">
          <div
            className={cn(
              "pointer-events-auto grid h-14 w-[min(70vw,64rem)] min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 sm:gap-3",
              "rounded-bl-[1.75rem] rounded-br-[1.75rem] border border-t-0 border-border bg-white shadow-md",
              "text-foreground"
            )}
          >
            <Link
              href={ROUTES.HOME}
              suppressHydrationWarning
              aria-label={t("brand.name")}
              className="min-w-0 justify-self-start rounded-md transition-opacity hover:opacity-80"
            >
              <AppLogo height={26} priority />
            </Link>
            <PrimaryNavLinks className="min-w-0 justify-self-center" />
            <div className="justify-self-end">
              <div className="flex items-center gap-4">
                <LanguageToggle />
                <AuthNavActions />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: brand + language + auth */}
        <div className="pointer-events-auto flex items-center justify-between gap-2 px-3 pt-3 sm:hidden">
          <Link
            href={ROUTES.HOME}
            suppressHydrationWarning
            aria-label={t("brand.name")}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white shadow-sm"
          >
            <AppLogo shape="mark" height={22} priority />
          </Link>
          <div className="flex min-w-0 items-center gap-1.5">
            <LanguageToggle className="bg-white shadow-sm" />
            <AuthNavActions
              className="gap-1.5"
              linkClassName="h-9 rounded-xl px-2.5 text-xs shadow-sm"
            />
          </div>
        </div>
      </header>

      <MobileBottomNav />
    </>
  );
}
