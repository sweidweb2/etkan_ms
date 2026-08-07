import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  armGlobalTopLoaderNavigation,
  bindGlobalTopLoaderSources,
  shouldTrackFetch,
} from "@/lib/loaders/bind-global-top-loader";
import { globalTopLoaderSession } from "@/lib/loaders/global-top-loader-session";

describe("shouldTrackFetch", () => {
  it("tracks RSC navigations and refreshes", () => {
    expect(
      shouldTrackFetch("/manager/workshops", {
        headers: { RSC: "1" },
      })
    ).toBe(true);
    expect(
      shouldTrackFetch("/manager/workshops", {
        headers: { RSC: "1", "Next-Router-Refresh": "1" },
      })
    ).toBe(true);
  });

  it("tracks server actions", () => {
    expect(
      shouldTrackFetch("/manager/workshops", {
        method: "POST",
        headers: { "Next-Action": "abc" },
      })
    ).toBe(true);
  });

  it("skips prefetch RSC", () => {
    expect(
      shouldTrackFetch("/manager/workshops", {
        headers: { RSC: "1", "Next-Router-Prefetch": "1" },
      })
    ).toBe(false);
  });

  it("skips unrelated fetches", () => {
    expect(shouldTrackFetch("/api/auth/navbar-state")).toBe(false);
  });
});

describe("armGlobalTopLoaderNavigation", () => {
  let historyState: { path: string };

  beforeEach(() => {
    historyState = { path: "/" };

    const locationStub = {
      get pathname() {
        return historyState.path.split("?")[0] || "/";
      },
      get search() {
        return historyState.path.includes("?")
          ? historyState.path.slice(historyState.path.indexOf("?"))
          : "";
      },
      get href() {
        return `http://localhost${historyState.path}`;
      },
      origin: "http://localhost",
    };

    const historyStub = {
      pushState: ((_data: unknown, _unused: string, url?: string | URL | null) => {
        if (url != null) historyState.path = String(url);
      }) as History["pushState"],
      replaceState: ((
        _data: unknown,
        _unused: string,
        url?: string | URL | null
      ) => {
        if (url != null) historyState.path = String(url);
      }) as History["replaceState"],
    };

    vi.stubGlobal("document", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal("window", {
      location: locationStub,
      history: historyStub,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      fetch: vi.fn(),
    });
  });

  afterEach(() => {
    globalTopLoaderSession.__reset();
    vi.unstubAllGlobals();
  });

  it("is a no-op when bindings are not mounted", () => {
    expect(() => armGlobalTopLoaderNavigation()).not.toThrow();
    expect(globalTopLoaderSession.__getPendingCount()).toBe(0);
  });

  it("arms a nav session while bindings are active", () => {
    const binding = bindGlobalTopLoaderSources();
    expect(globalTopLoaderSession.__getPendingCount()).toBe(0);

    armGlobalTopLoaderNavigation();
    expect(globalTopLoaderSession.__getPendingCount()).toBe(1);

    binding.notifyRouteSettled();
    expect(globalTopLoaderSession.__getPendingCount()).toBe(0);

    binding.cleanup();
  });

  it("arms before pushState updates the URL", () => {
    const binding = bindGlobalTopLoaderSources();
    const pendingBefore = globalTopLoaderSession.__getPendingCount();

    window.history.pushState({}, "", "/manager/workshops-arm-test");
    expect(globalTopLoaderSession.__getPendingCount()).toBeGreaterThan(
      pendingBefore
    );

    binding.notifyRouteSettled();
    binding.cleanup();
  });
});
