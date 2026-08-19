import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createNavStepTimer } from "@/lib/debug/nav-timing";

describe("createNavStepTimer", () => {
  const previousFlag = process.env.NEXT_PUBLIC_NAV_DEBUG;

  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    if (previousFlag === undefined) {
      delete process.env.NEXT_PUBLIC_NAV_DEBUG;
    } else {
      process.env.NEXT_PUBLIC_NAV_DEBUG = previousFlag;
    }
    vi.restoreAllMocks();
  });

  it("does not log when nav debug is off", async () => {
    process.env.NEXT_PUBLIC_NAV_DEBUG = "0";
    const timer = createNavStepTimer("addStudentToClass");
    await timer.step("auth", async () => "ok");
    timer.end();
    expect(console.info).not.toHaveBeenCalled();
  });

  it("logs each step and total", async () => {
    process.env.NEXT_PUBLIC_NAV_DEBUG = "1";
    const timer = createNavStepTimer("addStudentToClass");
    await timer.step("auth", async () => null);
    await timer.step("enroll", async () => null);
    timer.end();

    expect(console.info).toHaveBeenCalledWith(
      expect.stringMatching(
        /\[NAV op\] addStudentToClass auth=\d+ms enroll=\d+ms total=\d+ms/
      )
    );
  });
});
