import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGlobalTopLoaderSession } from "@/lib/loaders/global-top-loader-session";

describe("createGlobalTopLoaderSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createSession() {
    return createGlobalTopLoaderSession({
      setTimeout: (fn, ms) => setTimeout(fn, ms) as never,
      clearTimeout: (id) => {
        if (id != null) clearTimeout(id as never);
      },
      setInterval: (fn, ms) => setInterval(fn, ms) as never,
      clearInterval: (id) => {
        if (id != null) clearInterval(id as never);
      },
      now: () => Date.now(),
      random: () => 0.5,
    });
  }

  it("delays visibility then jumps to start progress", () => {
    const session = createSession();
    session.start();

    expect(session.getSnapshot()).toEqual({ progress: 0, visible: false });

    vi.advanceTimersByTime(49);
    expect(session.getSnapshot().visible).toBe(false);

    vi.advanceTimersByTime(1);
    expect(session.getSnapshot()).toEqual({ progress: 18, visible: true });
  });

  it("trickles forward but never reaches 100 while pending", () => {
    const session = createSession();
    session.start();
    vi.advanceTimersByTime(50);

    for (let i = 0; i < 40; i += 1) {
      vi.advanceTimersByTime(320);
    }

    const { progress, visible } = session.getSnapshot();
    expect(visible).toBe(true);
    expect(progress).toBeGreaterThan(18);
    expect(progress).toBeLessThanOrEqual(92);
  });

  it("completes to 100 then hides after last end", () => {
    const session = createSession();
    const token = session.start();
    vi.advanceTimersByTime(50);

    session.end(token);
    expect(session.getSnapshot().progress).toBe(100);
    expect(session.getSnapshot().visible).toBe(true);

    vi.advanceTimersByTime(200);
    expect(session.getSnapshot().visible).toBe(false);

    vi.advanceTimersByTime(180);
    expect(session.getSnapshot()).toEqual({ progress: 0, visible: false });
  });

  it("keeps one session across overlapping ops without restart flicker", () => {
    const session = createSession();
    const a = session.start();
    vi.advanceTimersByTime(50);
    const progressAfterShow = session.getSnapshot().progress;

    const b = session.start();
    expect(session.getSnapshot().visible).toBe(true);
    expect(session.getSnapshot().progress).toBeGreaterThanOrEqual(
      progressAfterShow
    );

    session.end(a);
    expect(session.getSnapshot().progress).toBeLessThan(100);
    expect(session.getSnapshot().visible).toBe(true);

    session.end(b);
    expect(session.getSnapshot().progress).toBe(100);
  });

  it("trackAsync starts and ends around a promise", async () => {
    const session = createSession();
    let resolve!: (value: string) => void;
    const promise = new Promise<string>((res) => {
      resolve = res;
    });

    const tracked = session.trackAsync(promise);
    expect(session.__getPendingCount()).toBe(1);

    vi.advanceTimersByTime(50);
    expect(session.getSnapshot().visible).toBe(true);

    resolve("ok");
    await expect(tracked).resolves.toBe("ok");
    expect(session.getSnapshot().progress).toBe(100);
  });

  it("ignores end for unknown tokens", () => {
    const session = createSession();
    const token = session.start();
    session.end(9999);
    expect(session.__getPendingCount()).toBe(1);
    session.end(token);
    expect(session.__getPendingCount()).toBe(0);
  });
});
