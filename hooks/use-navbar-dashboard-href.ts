"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type NavbarStateResponse = {
  dashboardHref: string | null;
};

type NavbarFetchResult = {
  pathname: string;
  dashboardHref: string | null;
};

export function useNavbarDashboardHref(initialDashboardHref: string | null) {
  const pathname = usePathname();
  const [fetchResult, setFetchResult] = useState<NavbarFetchResult | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;

    async function loadNavbarState() {
      try {
        const response = await fetch("/api/auth/navbar-state", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as NavbarStateResponse;

        if (!cancelled) {
          setFetchResult({
            pathname,
            dashboardHref: data.dashboardHref,
          });
        }
      } catch {
        // Keep the server-provided href when the request fails.
      }
    }

    void loadNavbarState();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (fetchResult?.pathname === pathname) {
    return fetchResult.dashboardHref;
  }

  return initialDashboardHref;
}
