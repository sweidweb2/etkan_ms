"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const MIN_VISIBLE_MS = 450;
const FINISH_MS = 280;
/** Abort if a started navigation never settles (e.g. prevented link click). */
const STUCK_ABORT_MS = 4000;

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function getSameOriginPath(href: string): string | null {
  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

function currentPath() {
  return `${window.location.pathname}${window.location.search}`;
}

/**
 * Global top progress bar for App Router navigations (panel + public).
 * Starts on internal link clicks and history.pushState (router.push).
 * Stays visible until the route settles, with a minimum display time.
 */
export function RouteTopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  const [isLoading, setIsLoading] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const routeKeyRef = useRef(routeKey);
  const navTokenRef = useRef(0);
  const startedAtRef = useRef(0);
  const finishTimerRef = useRef<number | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const stuckTimerRef = useRef<number | null>(null);

  const clearTimer = (ref: { current: number | null }) => {
    if (ref.current !== null) {
      window.clearTimeout(ref.current);
      ref.current = null;
    }
  };

  const reset = () => {
    clearTimer(finishTimerRef);
    clearTimer(settleTimerRef);
    clearTimer(showTimerRef);
    clearTimer(stuckTimerRef);
    setIsLoading(false);
    setIsFinishing(false);
    navTokenRef.current = 0;
  };

  const begin = () => {
    clearTimer(finishTimerRef);
    clearTimer(settleTimerRef);
    clearTimer(showTimerRef);
    clearTimer(stuckTimerRef);

    const token = ++navTokenRef.current;
    startedAtRef.current = Date.now();

    // Defer paint updates — Next may invoke pushState inside useInsertionEffect.
    showTimerRef.current = window.setTimeout(() => {
      if (navTokenRef.current !== token) return;
      setIsFinishing(false);
      setIsLoading(true);
    }, 0);

    stuckTimerRef.current = window.setTimeout(() => {
      if (navTokenRef.current !== token) return;
      reset();
    }, STUCK_ABORT_MS);
  };

  const end = () => {
    const token = navTokenRef.current;
    if (token === 0) return;

    clearTimer(settleTimerRef);
    clearTimer(stuckTimerRef);

    const elapsed = Date.now() - startedAtRef.current;
    const waitForMin = Math.max(0, MIN_VISIBLE_MS - elapsed);

    settleTimerRef.current = window.setTimeout(() => {
      if (navTokenRef.current !== token) return;

      setIsFinishing(true);
      setIsLoading(false);

      clearTimer(finishTimerRef);
      finishTimerRef.current = window.setTimeout(() => {
        if (navTokenRef.current !== token) return;
        setIsFinishing(false);
        navTokenRef.current = 0;
      }, FINISH_MS);
    }, waitForMin);
  };

  // Internal <a> navigations (sidebar, breadcrumbs, links).
  // Bubble phase so nested buttons can preventDefault/stopPropagation first
  // (e.g. Edit on a card that is wrapped in a Link).
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || isModifiedClick(event) || event.defaultPrevented) {
        return;
      }

      const el = event.target;
      if (!(el instanceof Element)) return;

      const anchor = el.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      const next = getSameOriginPath(href);
      if (!next || next === currentPath()) return;

      begin();
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // router.push / back / forward
  useEffect(() => {
    const onPopState = () => {
      begin();
    };
    window.addEventListener("popstate", onPopState);

    const originalPushState = window.history.pushState.bind(window.history);
    window.history.pushState = ((data, unused, url) => {
      const prev = currentPath();
      const result = originalPushState(data, unused, url);
      if (url != null) {
        const next = getSameOriginPath(String(url));
        if (next && next !== prev) {
          begin();
        }
      }
      return result;
    }) as History["pushState"];

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.history.pushState = originalPushState;
    };
  }, []);

  // Route settled → ensure loader ran, then finish after minimum visible time.
  useEffect(() => {
    if (routeKeyRef.current === routeKey) return;
    routeKeyRef.current = routeKey;

    // Fallback when click/pushState did not start the loader (still show on settle).
    if (navTokenRef.current === 0) {
      begin();
    }
    end();
  }, [routeKey]);

  useEffect(() => {
    return () => {
      clearTimer(finishTimerRef);
      clearTimer(showTimerRef);
      clearTimer(settleTimerRef);
      clearTimer(stuckTimerRef);
    };
  }, []);

  const isVisible = isLoading || isFinishing;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[200] h-1 transition-opacity duration-150",
        isVisible ? "opacity-100" : "opacity-0"
      )}
      aria-hidden
    >
      <div
        className={cn(
          "route-top-loader-bar h-full bg-white",
          "shadow-[0_0_0_1px_var(--primary),0_0_8px_rgba(62,62,117,0.5)]",
          "dark:bg-[#C4C4E8] dark:shadow-[0_0_0_1px_var(--primary),0_0_8px_rgba(154,154,208,0.55)]",
          isLoading && "route-top-loader-bar-active",
          isFinishing && "route-top-loader-bar-finishing"
        )}
      />
    </div>
  );
}

/** @deprecated Use `RouteTopLoader` — mounted globally in `app/layout.tsx`. */
export const PanelTopLoader = RouteTopLoader;
