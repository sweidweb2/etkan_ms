import { describe, expect, it } from "vitest";
import {
  commitCardMove,
  commitColumnMove,
} from "@/lib/kanban/board-state";

describe("commitCardMove", () => {
  const board = {
    unassigned: ["a", "b", "c"],
    stage1: ["d"],
  };

  it("moves across columns at the measured insert index", () => {
    expect(
      commitCardMove(board, {
        sourceColumnId: "unassigned",
        sourceIndex: 1,
        targetColumnId: "stage1",
        insertIndex: 0,
      })
    ).toEqual({
      unassigned: ["a", "c"],
      stage1: ["b", "d"],
    });
  });

  it("uses post-removal insert index for same-column moves", () => {
    expect(
      commitCardMove(board, {
        sourceColumnId: "unassigned",
        sourceIndex: 0,
        targetColumnId: "unassigned",
        insertIndex: 2,
      })
    ).toEqual({
      unassigned: ["b", "c", "a"],
      stage1: ["d"],
    });
  });

  it("returns null when the card would not move", () => {
    expect(
      commitCardMove(board, {
        sourceColumnId: "unassigned",
        sourceIndex: 1,
        targetColumnId: "unassigned",
        insertIndex: 1,
      })
    ).toBeNull();
  });
});

describe("commitColumnMove", () => {
  const order = ["a", "b", "c", "d"];

  it("moves a column with post-removal insert index", () => {
    expect(
      commitColumnMove(order, { sourceIndex: 0, insertIndex: 3 })
    ).toEqual(["b", "c", "d", "a"]);
    expect(
      commitColumnMove(order, { sourceIndex: 3, insertIndex: 0 })
    ).toEqual(["d", "a", "b", "c"]);
    expect(
      commitColumnMove(order, { sourceIndex: 1, insertIndex: 2 })
    ).toEqual(["a", "c", "b", "d"]);
  });

  it("returns null when the column would not move", () => {
    expect(
      commitColumnMove(order, { sourceIndex: 1, insertIndex: 1 })
    ).toBeNull();
  });
});
