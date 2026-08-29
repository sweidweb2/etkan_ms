"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { AppLogo } from "@/components/brand/app-logo";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { useHydrated } from "@/hooks/use-hydrated";
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

function RegisterNavLink({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const { t } = usePublicI18n();
  const pathname = usePathname();
  const isActive = pathname === ROUTES.REGISTER;

  return (
    <Link
      href={ROUTES.REGISTER}
      suppressHydrationWarning
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(buttonVariants({ variant: "default", size: "default" }), className)}
    >
      {t("nav.register")}
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
      <BrandNavLink href={ROUTES.GALLERY}>{t("nav.gallery")}</BrandNavLink>
    </nav>
  );
}

function NavbarShell({
  desktopActions,
  mobileMenu,
}: {
  desktopActions?: React.ReactNode;
  mobileMenu?: React.ReactNode;
}) {
  const { t } = usePublicI18n();

  return (
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
          <div className="justify-self-end">{desktopActions}</div>
        </div>
      </div>

      {/* Mobile: brand mark + menu icon */}
      <div className="pointer-events-auto flex items-center justify-between px-3 pt-3 sm:hidden">
        <Link
          href={ROUTES.HOME}
          suppressHydrationWarning
          aria-label={t("brand.name")}
          className="flex size-10 items-center justify-center rounded-xl border border-border bg-white shadow-sm"
        >
          <AppLogo shape="mark" height={22} priority />
        </Link>
        {mobileMenu}
      </div>
    </header>
  );
}

export function SiteNavbarClient() {
  const pathname = usePathname();
  const mounted = useHydrated();
  const { t, dir } = usePublicI18n();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [menuPathname, setMenuPathname] = useState(pathname);

  if (pathname !== menuPathname) {
    setMenuPathname(pathname);
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }

  const sheetSide = dir === "rtl" ? "left" : "right";
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const mobileMenu = (
    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t("nav.openMenu")}
            className="size-10 rounded-xl border-border bg-white shadow-sm dark:bg-white"
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
          <SheetTitle>
            <AppLogo height={24} />
          </SheetTitle>
          <SheetDescription>{t("nav.navigate")}</SheetDescription>
        </SheetHeader>
        <div className="border-b border-border px-4 py-3">
          <LanguageToggle />
        </div>
        <nav className="flex flex-col gap-1 p-3" aria-label="Mobile">
          <MobileNavLink href={ROUTES.HOME} onNavigate={closeMobileMenu}>
            {t("nav.home")}
          </MobileNavLink>
          <MobileNavLink href={ROUTES.ABOUT} onNavigate={closeMobileMenu}>
            {t("nav.about")}
          </MobileNavLink>
          <MobileNavLink href={ROUTES.CAREERS} onNavigate={closeMobileMenu}>
            {t("nav.careers")}
          </MobileNavLink>
          <MobileNavLink href={ROUTES.PROJECTS} onNavigate={closeMobileMenu}>
            {t("nav.projects")}
          </MobileNavLink>
          <MobileNavLink href={ROUTES.GALLERY} onNavigate={closeMobileMenu}>
            {t("nav.gallery")}
          </MobileNavLink>
          <div className="mt-2 px-1">
            <RegisterNavLink
              className="w-full justify-center"
              onNavigate={closeMobileMenu}
            />
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );

  if (!mounted) {
    return (
      <NavbarShell
        desktopActions={
          <div className="flex items-center gap-2" aria-hidden="true">
            <LanguageToggle />
            <RegisterNavLink />
          </div>
        }
        mobileMenu={
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t("nav.openMenu")}
            className="size-10 rounded-xl border-border bg-white shadow-sm dark:bg-white"
            disabled
          >
            <MenuIcon />
          </Button>
        }
      />
    );
  }

  return (
    <NavbarShell
      desktopActions={
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <RegisterNavLink />
        </div>
      }
      mobileMenu={mobileMenu}
    />
  );
}
