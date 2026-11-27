import { describe, expect, it, vi } from "vitest";
import { logOpsWarn } from "@/lib/ops/logger";
import {
  coalesceWarning,
  messageFromUnknown,
  warnSoftFailure,
} from "@/lib/ops/soft-success";

vi.mock("@/lib/ops/logger", () => ({
  logOpsWarn: vi.fn(),
}));

describe("soft-success helpers", () => {
  it("coalesceWarning merges distinct warnings", () => {
    expect(coalesceWarning("first", "second")).toBe("first second");
    expect(coalesceWarning(undefined, "second")).toBe("second");
    expect(coalesceWarning("same", "same")).toBe("same");
    expect(coalesceWarning("seed failed", "seed failed later")).toBe(
      "seed failed later"
    );
  });

  it("messageFromUnknown prefers Error messages", () => {
    expect(messageFromUnknown(new Error("boom"), "fallback")).toBe("boom");
    expect(messageFromUnknown("raw", "fallback")).toBe("raw");
    expect(messageFromUnknown(null, "fallback")).toBe("fallback");
  });

  it("warnSoftFailure logs detail and can return a stable user message", () => {
    const warning = warnSoftFailure(
      "scope",
      new Error("db detail"),
      "fallback",
      { id: "1" },
      { userMessage: "stable" }
    );

    expect(warning).toBe("stable");
    expect(logOpsWarn).toHaveBeenCalledWith("scope", "db detail", { id: "1" });
  });
});
