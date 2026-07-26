"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { useHydrated } from "@/hooks/use-hydrated";
import { useNavbarDashboardHref } from "@/hooks/use-navbar-dashboard-href";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

type NavLinkProps = {
  href: string;
  variant?: "default" | "ghost";
  children: React.ReactNode;
  className?: string;
  onNavigate?: () => void;
};

function NavLink({
  href,
  variant = "default",
  children,
  className,
  onNavigate,
}: NavLinkProps) {
  return (
    <Link
      href={href}
      suppressHydrationWarning
      onClick={onNavigate}
      className={cn(buttonVariants({ variant, size: "default" }), className)}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      suppressHydrationWarning
      onClick={onNavigate}
      className={cn(
        "rounded-lg px-3 py-3 text-base font-medium transition-colors",
        isActive
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}

function NavbarShell({ children }: { children?: React.ReactNode }) {
  const { t } = usePublicI18n();

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center">
      <div
        className={cn(
          "pointer-events-auto flex h-14 w-[70vw] min-w-0 max-w-5xl items-center justify-between gap-3 overflow-hidden px-4",
          "rounded-bl-[1.75rem] rounded-br-[1.75rem] border border-t-0 border-white/20 bg-background/25 shadow-sm",
          "backdrop-blur-xl supports-backdrop-filter:bg-background/15"
        )}
      >
        <Link
          href={ROUTES.HOME}
          suppressHydrationWarning
          className="truncate text-sm font-semibold"
        >
          {t("brand.name")}
        </Link>
        {children}
      </div>
    </header>
  );
}

type SiteNavbarClientProps = {
  initialDashboardHref: string | null;
};

export function SiteNavbarClient({
  initialDashboardHref,
}: SiteNavbarClientProps) {
  const pathname = usePathname();
  const mounted = useHydrated();
  const { t, dir } = usePublicI18n();
  const dashboardHref = useNavbarDashboardHref(initialDashboardHref);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [menuPathname, setMenuPathname] = useState(pathname);

  if (pathname !== menuPathname) {
    setMenuPathname(pathname);
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }

  if (!mounted) {
    return (
      <NavbarShell>
        <div className="flex items-center gap-2" aria-hidden="true">
          <LanguageToggle />
        </div>
      </NavbarShell>
    );
  }

  const isLoginPage = pathname === ROUTES.LOGIN;
  const isSignupPage = pathname === ROUTES.SIGNUP;
  const isAuthPage = isLoginPage || isSignupPage;
  const sheetSide = dir === "rtl" ? "left" : "right";

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const desktopLinks = (
    <>
      {isAuthPage ? (
        <NavLink href={ROUTES.HOME} variant="ghost">
          {t("nav.home")}
        </NavLink>
      ) : null}
      {dashboardHref ? (
        <NavLink href={dashboardHref}>{t("nav.dashboard")}</NavLink>
      ) : (
        <>
          {!isLoginPage ? (
            <NavLink href={ROUTES.LOGIN} variant="ghost">
              {t("nav.login")}
            </NavLink>
          ) : null}
          {!isSignupPage ? (
            <NavLink href={ROUTES.SIGNUP}>{t("nav.register")}</NavLink>
          ) : null}
        </>
      )}
    </>
  );

  const mobileLinks = (
    <>
      <MobileNavLink href={ROUTES.HOME} onNavigate={closeMobileMenu}>
        {t("nav.home")}
      </MobileNavLink>
      {dashboardHref ? (
        <MobileNavLink href={dashboardHref} onNavigate={closeMobileMenu}>
          {t("nav.dashboard")}
        </MobileNavLink>
      ) : (
        <>
          {!isLoginPage ? (
            <MobileNavLink href={ROUTES.LOGIN} onNavigate={closeMobileMenu}>
              {t("nav.login")}
            </MobileNavLink>
          ) : null}
          {!isSignupPage ? (
            <MobileNavLink href={ROUTES.SIGNUP} onNavigate={closeMobileMenu}>
              {t("nav.register")}
            </MobileNavLink>
          ) : null}
        </>
      )}
    </>
  );

  return (
    <NavbarShell>
      <div className="hidden items-center gap-2 sm:flex">
        <nav className="flex items-center gap-2" aria-label="Main">
          {desktopLinks}
        </nav>
        <LanguageToggle />
      </div>

      <div className="flex items-center gap-2 sm:hidden">
        <LanguageToggle />
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={t("nav.openMenu")}
              />
            }
          >
            <MenuIcon />
          </SheetTrigger>
          <SheetContent
            side={sheetSide}
            className={cn(
              "w-[min(100%,18rem)] gap-0 p-0",
              "duration-500 data-open:duration-500 data-closed:duration-500",
              "ease-[cubic-bezier(0.22,1,0.36,1)]"
            )}
          >
            <SheetHeader className="border-b border-border px-4 py-4 text-start">
              <SheetTitle>{t("brand.name")}</SheetTitle>
              <SheetDescription>{t("nav.navigate")}</SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-3" aria-label="Mobile">
              {mobileLinks}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </NavbarShell>
  );
}
