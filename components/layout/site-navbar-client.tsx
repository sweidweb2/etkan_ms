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

type AuthNavLinkProps = {
  href: string;
  variant?: "default" | "ghost";
  children: React.ReactNode;
  className?: string;
  onNavigate?: () => void;
};

function AuthNavLink({
  href,
  variant = "default",
  children,
  className,
  onNavigate,
}: AuthNavLinkProps) {
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

function BrandNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      suppressHydrationWarning
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
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
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "rounded-lg px-3 py-3 text-base font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}

function PrimaryNavLinks({ className }: { className?: string }) {
  const { t } = usePublicI18n();

  return (
    <nav className={cn("flex items-center gap-1", className)} aria-label="Main">
      <BrandNavLink href={ROUTES.HOME}>{t("nav.home")}</BrandNavLink>
      <BrandNavLink href={ROUTES.ABOUT}>{t("nav.about")}</BrandNavLink>
      <BrandNavLink href={ROUTES.CAREERS}>{t("nav.careers")}</BrandNavLink>
      <BrandNavLink href={ROUTES.PROJECTS}>{t("nav.projects")}</BrandNavLink>
      <BrandNavLink href={ROUTES.LIFE}>{t("nav.life")}</BrandNavLink>
    </nav>
  );
}

function NavbarShell({
  actions,
}: {
  actions?: React.ReactNode;
}) {
  const { t } = usePublicI18n();

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center">
      <div
        className={cn(
          "pointer-events-auto grid h-14 w-[70vw] min-w-0 max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-3 overflow-hidden px-4",
          "rounded-bl-[1.75rem] rounded-br-[1.75rem] border border-t-0 border-border bg-white shadow-sm",
          "text-foreground dark:bg-white dark:text-foreground"
        )}
      >
        <Link
          href={ROUTES.HOME}
          suppressHydrationWarning
          className="min-w-0 justify-self-start truncate text-sm font-semibold"
        >
          {t("brand.name")}
        </Link>
        <PrimaryNavLinks className="hidden justify-self-center sm:flex" />
        <div className="justify-self-end">{actions}</div>
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
      <NavbarShell
        actions={
          <div className="flex items-center gap-2" aria-hidden="true">
            <LanguageToggle />
          </div>
        }
      />
    );
  }

  const isLoginPage = pathname === ROUTES.LOGIN;
  const isSignupPage = pathname === ROUTES.SIGNUP;
  const sheetSide = dir === "rtl" ? "left" : "right";

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const authButtons = dashboardHref ? (
    <AuthNavLink href={dashboardHref}>{t("nav.dashboard")}</AuthNavLink>
  ) : (
    <>
      {!isLoginPage ? (
        <AuthNavLink href={ROUTES.LOGIN} variant="ghost">
          {t("nav.login")}
        </AuthNavLink>
      ) : null}
      {!isSignupPage ? (
        <AuthNavLink href={ROUTES.SIGNUP}>{t("nav.register")}</AuthNavLink>
      ) : null}
    </>
  );

  return (
    <NavbarShell
      actions={
        <>
          <div className="hidden items-center gap-2 sm:flex">
            <LanguageToggle />
            <div className="flex items-center gap-2">{authButtons}</div>
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
                  <MobileNavLink
                    href={ROUTES.HOME}
                    onNavigate={closeMobileMenu}
                  >
                    {t("nav.home")}
                  </MobileNavLink>
                  <MobileNavLink
                    href={ROUTES.ABOUT}
                    onNavigate={closeMobileMenu}
                  >
                    {t("nav.about")}
                  </MobileNavLink>
                  <MobileNavLink
                    href={ROUTES.CAREERS}
                    onNavigate={closeMobileMenu}
                  >
                    {t("nav.careers")}
                  </MobileNavLink>
                  <MobileNavLink
                    href={ROUTES.PROJECTS}
                    onNavigate={closeMobileMenu}
                  >
                    {t("nav.projects")}
                  </MobileNavLink>
                  <MobileNavLink
                    href={ROUTES.LIFE}
                    onNavigate={closeMobileMenu}
                  >
                    {t("nav.life")}
                  </MobileNavLink>
                  {dashboardHref ? (
                    <MobileNavLink
                      href={dashboardHref}
                      onNavigate={closeMobileMenu}
                    >
                      {t("nav.dashboard")}
                    </MobileNavLink>
                  ) : (
                    <>
                      {!isLoginPage ? (
                        <MobileNavLink
                          href={ROUTES.LOGIN}
                          onNavigate={closeMobileMenu}
                        >
                          {t("nav.login")}
                        </MobileNavLink>
                      ) : null}
                      {!isSignupPage ? (
                        <MobileNavLink
                          href={ROUTES.SIGNUP}
                          onNavigate={closeMobileMenu}
                        >
                          {t("nav.register")}
                        </MobileNavLink>
                      ) : null}
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </>
      }
    />
  );
}
