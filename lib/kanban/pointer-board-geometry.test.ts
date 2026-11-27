import { describe, expect, it } from "vitest";
import { isPointerOutsideElement } from "@/lib/kanban/pointer-board-geometry";

describe("isPointerOutsideElement", () => {
  it("detects points outside the element box", () => {
    const element = {
      getBoundingClientRect: () => ({
        left: 10,
        right: 110,
        top: 20,
        bottom: 120,
      }),
    } as HTMLElement;

    expect(isPointerOutsideElement(5, 50, element)).toBe(true);
    expect(isPointerOutsideElement(50, 50, element)).toBe(false);
    expect(isPointerOutsideElement(110, 120, element)).toBe(false);
    expect(isPointerOutsideElement(111, 120, element)).toBe(true);
  });
});
