import { describe, expect, it } from "vitest";
import { getInitials } from "@/lib/utils/display-name";

describe("getInitials", () => {
  it("uses first letters of first and last name", () => {
    expect(getInitials("Jane Doe")).toBe("JD");
  });

  it("uses first two characters for a single word", () => {
    expect(getInitials("Admin")).toBe("AD");
  });

  it("handles extra whitespace", () => {
    expect(getInitials("  Sam   Lee  ")).toBe("SL");
  });
});
