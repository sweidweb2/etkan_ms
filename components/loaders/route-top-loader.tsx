"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { navTimingClientRouteSettled } from "@/lib/debug/nav-timing";
import { bindGlobalTopLoaderSources } from "@/lib/loaders/bind-global-top-loader";
import { globalTopLoaderSession } from "@/lib/loaders/global-top-loader-session";
import { cn } from "@/lib/utils";

const SERVER_SNAPSHOT = { progress: 0, visible: false } as const;

/**
 * Global top progress bar for App Router navigations. Mount once in the
 * root layout. Form submits and router.refresh do not drive this bar.
 */
export function RouteTopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const routeKeyRef = useRef(routeKey);
  const notifyRouteSettledRef = useRef<(() => void) | null>(null);

  const snapshot = useSyncExternalStore(
    globalTopLoaderSession.subscribe,
    globalTopLoaderSession.getSnapshot,
    () => SERVER_SNAPSHOT
  );

  useEffect(() => {
    const binding = bindGlobalTopLoaderSources();
    notifyRouteSettledRef.current = binding.notifyRouteSettled;
    return () => {
      notifyRouteSettledRef.current = null;
      binding.cleanup();
    };
  }, []);

  useEffect(() => {
    if (routeKeyRef.current === routeKey) return;
    routeKeyRef.current = routeKey;
    navTimingClientRouteSettled();
    notifyRouteSettledRef.current?.();
  }, [routeKey]);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[200] h-1 transition-opacity duration-200",
        snapshot.visible ? "opacity-100" : "opacity-0"
      )}
      aria-hidden
    >
      <div
        className="h-full origin-left bg-white shadow-[0_0_0_1px_var(--primary),0_0_8px_rgba(62,62,117,0.5)] transition-transform duration-200 ease-out dark:bg-[#C4C4E8] dark:shadow-[0_0_0_1px_var(--primary),0_0_8px_rgba(154,154,208,0.55)]"
        style={{ transform: `scaleX(${snapshot.progress / 100})` }}
      />
    </div>
  );
}

/** @deprecated Use `RouteTopLoader` — mounted globally in `app/layout.tsx`. */
export const PanelTopLoader = RouteTopLoader;
