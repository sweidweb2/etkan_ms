"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/config/site";
import { ROUTES } from "@/lib/constants/routes";

type NavButtonLinkProps = {
  href: string;
  variant?: "default" | "ghost" | "outline";
  children: React.ReactNode;
};

function NavButtonLink({
  href,
  variant = "default",
  children,
}: NavButtonLinkProps) {
  return (
    <Button variant={variant} nativeButton={false} render={<Link href={href} />}>
      {children}
    </Button>
  );
}

export function SiteNavbar() {
  const pathname = usePathname();
  const isLoginPage = pathname === ROUTES.LOGIN;
  const isSignupPage = pathname === ROUTES.SIGNUP;
  const isAuthPage = isLoginPage || isSignupPage;

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href={ROUTES.HOME} className="text-sm font-semibold">
          {SITE.name}
        </Link>
        <nav className="flex items-center gap-2">
          {isAuthPage ? (
            <NavButtonLink href={ROUTES.HOME} variant="ghost">
              Home
            </NavButtonLink>
          ) : null}
          {!isLoginPage ? (
            <NavButtonLink href={ROUTES.LOGIN} variant="ghost">
              Log in
            </NavButtonLink>
          ) : null}
          {!isSignupPage ? (
            <NavButtonLink href={ROUTES.SIGNUP}>Register</NavButtonLink>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
