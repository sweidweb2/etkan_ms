"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteNavbarClient } from "@/components/layout/site-navbar-client";
import { PublicSplashCursor } from "@/components/public/public-splash-cursor";
import { hidesPublicSiteChrome } from "@/lib/constants/routes";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";

type PublicShellProps = {
  children: ReactNode;
};

/**
 * Client shell so dir/lang update with locale without re-fetching the RSC tree.
 * Navbar starts with null session; client refreshes auth via /api/auth/navbar-state.
 */
export function PublicShell({ children }: PublicShellProps) {
  const { dir, locale } = usePublicI18n();
  const pathname = usePathname();
  const hideSiteChrome = hidesPublicSiteChrome(pathname);

  return (
    <div dir={dir} lang={locale} className="relative flex min-h-dvh flex-col">
      {hideSiteChrome ? null : (
        <SiteNavbarClient initialDashboardHref={null} />
      )}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      {hideSiteChrome ? null : <SiteFooter />}
      {hideSiteChrome ? null : (
        <div
          className="pointer-events-none fixed inset-0 -z-10"
          style={{ zIndex: 0 }}
          aria-hidden
        >
          <PublicSplashCursor />
        </div>
      )}
    </div>
  );
}
