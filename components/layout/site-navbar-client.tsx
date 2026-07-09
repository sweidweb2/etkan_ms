"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHydrated } from "@/hooks/use-hydrated";
import { useNavbarDashboardHref } from "@/hooks/use-navbar-dashboard-href";
import { buttonVariants } from "@/components/ui/button";
import { SITE } from "@/lib/config/site";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

type NavLinkProps = {
  href: string;
  variant?: "default" | "ghost";
  children: React.ReactNode;
};

function NavLink({ href, variant = "default", children }: NavLinkProps) {
  return (
    <Link
      href={href}
      suppressHydrationWarning
      className={cn(buttonVariants({ variant, size: "default" }))}
    >
      {children}
    </Link>
  );
}

function NavbarShell({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href={ROUTES.HOME}
          suppressHydrationWarning
          className="text-sm font-semibold"
        >
          {SITE.name}
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
  const dashboardHref = useNavbarDashboardHref(initialDashboardHref);

  if (!mounted) {
    return (
      <NavbarShell>
        <nav className="flex items-center gap-2" aria-hidden="true" />
      </NavbarShell>
    );
  }

  const isLoginPage = pathname === ROUTES.LOGIN;
  const isSignupPage = pathname === ROUTES.SIGNUP;
  const isAuthPage = isLoginPage || isSignupPage;

  return (
    <NavbarShell>
      <nav className="flex items-center gap-2">
        {isAuthPage ? (
          <NavLink href={ROUTES.HOME} variant="ghost">
            Home
          </NavLink>
        ) : null}
        {dashboardHref ? (
          <NavLink href={dashboardHref}>Dashboard</NavLink>
        ) : (
          <>
            {!isLoginPage ? (
              <NavLink href={ROUTES.LOGIN} variant="ghost">
                Log in
              </NavLink>
            ) : null}
            {!isSignupPage ? (
              <NavLink href={ROUTES.SIGNUP}>Register</NavLink>
            ) : null}
          </>
        )}
      </nav>
    </NavbarShell>
  );
}
