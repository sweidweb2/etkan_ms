import {
  globalTopLoaderSession,
  type GlobalTopLoaderToken,
} from "@/lib/loaders/global-top-loader-session";

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

function readHeader(
  headers: HeadersInit | undefined,
  name: string
): string | null {
  if (!headers) return null;
  if (headers instanceof Headers) {
    return headers.get(name);
  }
  if (Array.isArray(headers)) {
    const found = headers.find(
      ([key]) => key.toLowerCase() === name.toLowerCase()
    );
    return found?.[1] ?? null;
  }
  const record = headers as Record<string, string>;
  const match = Object.entries(record).find(
    ([key]) => key.toLowerCase() === name.toLowerCase()
  );
  return match?.[1] ?? null;
}

/** Track App Router RSC (incl. refresh) and server actions; skip prefetch. */
export function shouldTrackFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): boolean {
  const requestHeaders = input instanceof Request ? input.headers : undefined;
  const get = (name: string) =>
    readHeader(init?.headers, name) ??
    (requestHeaders ? requestHeaders.get(name) : null);

  if (get("Next-Router-Prefetch") === "1") return false;
  if (get("RSC") === "1") return true;
  if (get("Next-Action") || get("next-action")) return true;
  return false;
}

type BindState = {
  navToken: GlobalTopLoaderToken | null;
  /** True until pathname/search catches up after a link/history start. */
  awaitingRouteChange: boolean;
  fetchInflight: number;
};

type NavArmApi = {
  ensureNavToken: (awaitRouteChange: boolean) => void;
};

/** Set while `bindGlobalTopLoaderSources` is active. */
let activeNavArm: NavArmApi | null = null;

/**
 * Arm the top loader before `router.push` / `replace` when the click path
 * is not an `<a>` (e.g. panel search). No-op if bindings are not mounted.
 */
export function armGlobalTopLoaderNavigation() {
  activeNavArm?.ensureNavToken(true);
}

/**
 * Install click / history / fetch listeners for the global top loader.
 * Returns cleanup + `notifyRouteSettled` for the React route-key effect.
 */
export function bindGlobalTopLoaderSources() {
  const state: BindState = {
    navToken: null,
    awaitingRouteChange: false,
    fetchInflight: 0,
  };

  const tryReleaseNavToken = () => {
    if (state.navToken == null) return;
    if (state.awaitingRouteChange) return;
    if (state.fetchInflight > 0) return;
    globalTopLoaderSession.end(state.navToken);
    state.navToken = null;
  };

  const ensureNavToken = (awaitRouteChange: boolean) => {
    if (state.navToken == null) {
      state.navToken = globalTopLoaderSession.start();
    }
    if (awaitRouteChange) {
      state.awaitingRouteChange = true;
    }
  };

  activeNavArm = { ensureNavToken };

  const notifyRouteSettled = () => {
    if (state.navToken == null) return;
    state.awaitingRouteChange = false;
    tryReleaseNavToken();
  };

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
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:")
    ) {
      return;
    }

    const next = getSameOriginPath(href);
    if (!next || next === currentPath()) return;

    ensureNavToken(true);
  };

  document.addEventListener("click", onClick, true);

  const onPopState = () => {
    ensureNavToken(true);
  };
  window.addEventListener("popstate", onPopState);

  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(
    window.history
  );

  const patchHistory =
    (original: typeof window.history.pushState) =>
    ((data, unused, url) => {
      const prev = currentPath();
      if (url != null) {
        const next = getSameOriginPath(String(url));
        if (next && next !== prev) {
          // Arm before history updates so router.push matches Link click timing.
          ensureNavToken(true);
        }
      }
      return original(data, unused, url);
    }) as History["pushState"];

  window.history.pushState = patchHistory(originalPushState);
  window.history.replaceState = patchHistory(originalReplaceState);

  const originalFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (!shouldTrackFetch(input, init)) {
      return originalFetch(input, init);
    }

    state.fetchInflight += 1;
    const token = globalTopLoaderSession.start();

    const done = () => {
      state.fetchInflight = Math.max(0, state.fetchInflight - 1);
      globalTopLoaderSession.end(token);
      tryReleaseNavToken();
    };

    try {
      return Promise.resolve(originalFetch(input, init)).finally(done);
    } catch (error) {
      done();
      throw error;
    }
  }) as typeof window.fetch;

  const cleanup = () => {
    document.removeEventListener("click", onClick, true);
    window.removeEventListener("popstate", onPopState);
    window.history.pushState = originalPushState;
    window.history.replaceState = originalReplaceState;
    window.fetch = originalFetch;
    if (activeNavArm?.ensureNavToken === ensureNavToken) {
      activeNavArm = null;
    }
    if (state.navToken != null) {
      globalTopLoaderSession.end(state.navToken);
      state.navToken = null;
    }
  };

  return { cleanup, notifyRouteSettled };
}
