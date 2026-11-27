import { describe, expect, it } from "vitest";
import {
  findColumnInsertIndex,
  findInsertIndex,
  findTargetColumnId,
  type ColumnHitRange,
} from "@/lib/kanban/pointer-hit-test";

const columns: ColumnHitRange[] = [
  { id: "a", left: 0, right: 100, center: 50 },
  { id: "b", left: 120, right: 220, center: 170 },
  { id: "c", left: 240, right: 340, center: 290 },
];

describe("findTargetColumnId", () => {
  it("picks the column whose horizontal range contains pointer X", () => {
    expect(findTargetColumnId(30, columns)).toBe("a");
    expect(findTargetColumnId(200, columns)).toBe("b");
  });

  it("picks the closest center when pointer is in a gap or past edges", () => {
    expect(findTargetColumnId(110, columns)).toBe("a");
    expect(findTargetColumnId(115, columns)).toBe("b");
    expect(findTargetColumnId(-20, columns)).toBe("a");
    expect(findTargetColumnId(400, columns)).toBe("c");
  });
});

describe("findInsertIndex", () => {
  const cards = [
    { top: 0, height: 100 },
    { top: 120, height: 100 },
    { top: 240, height: 100 },
  ];

  it("inserts before the first card whose midpoint is below pointer Y", () => {
    expect(findInsertIndex(10, cards)).toBe(0);
    expect(findInsertIndex(49, cards)).toBe(0);
    expect(findInsertIndex(51, cards)).toBe(1);
    expect(findInsertIndex(169, cards)).toBe(1);
    expect(findInsertIndex(170, cards)).toBe(2);
  });

  it("returns end when pointer is below every midpoint", () => {
    expect(findInsertIndex(400, cards)).toBe(3);
  });

  it("returns 0 for an empty column", () => {
    expect(findInsertIndex(100, [])).toBe(0);
  });
});

describe("findColumnInsertIndex", () => {
  const columnBoxes = [
    { left: 0, width: 100 },
    { left: 120, width: 100 },
    { left: 240, width: 100 },
  ];

  it("inserts before the first column whose midpoint is right of pointer X", () => {
    expect(findColumnInsertIndex(10, columnBoxes)).toBe(0);
    expect(findColumnInsertIndex(49, columnBoxes)).toBe(0);
    expect(findColumnInsertIndex(51, columnBoxes)).toBe(1);
    expect(findColumnInsertIndex(169, columnBoxes)).toBe(1);
    expect(findColumnInsertIndex(170, columnBoxes)).toBe(2);
  });

  it("returns end when pointer is right of every midpoint", () => {
    expect(findColumnInsertIndex(400, columnBoxes)).toBe(3);
  });
});
