"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { SITE } from "@/lib/config/site";
import { getDashboardRouteForRole, ROUTES } from "@/lib/constants/routes";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { RoleValue } from "@/lib/constants/roles";

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

export function SiteNavbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [dashboardHref, setDashboardHref] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadNavbarAuthState() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setDashboardHref(null);
        }
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      const role = profile?.role as RoleValue | undefined;
      setDashboardHref(role ? getDashboardRouteForRole(role) : ROUTES.HOME);
    }

    loadNavbarAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadNavbarAuthState();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

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
