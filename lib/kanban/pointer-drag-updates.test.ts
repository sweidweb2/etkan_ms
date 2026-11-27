import { describe, expect, it } from "vitest";
import {
  buildCardDragFromPending,
  buildColumnDragFromPending,
  isSameCardDragTarget,
  isSameColumnDragTarget,
} from "@/lib/kanban/pointer-drag-updates";

describe("pointer drag updates", () => {
  it("builds card drag state from a pending pointer", () => {
    expect(
      buildCardDragFromPending(
        {
          dragType: "card",
          pointerId: 1,
          cardId: "c1",
          columnId: "col",
          index: 2,
          startX: 0,
          startY: 0,
          grabOffsetX: 4,
          grabOffsetY: 5,
          width: 100,
          height: 40,
        },
        10,
        20
      )
    ).toMatchObject({
      dragType: "card",
      draggingCardId: "c1",
      sourceColumnId: "col",
      sourceIndex: 2,
      targetColumnId: "col",
      insertIndex: 2,
      pointerX: 10,
      pointerY: 20,
    });
  });

  it("builds column drag state from a pending pointer", () => {
    expect(
      buildColumnDragFromPending(
        {
          dragType: "column",
          pointerId: 1,
          columnId: "col",
          sourceIndex: 1,
          startX: 0,
          startY: 0,
          grabOffsetX: 4,
          grabOffsetY: 5,
          width: 200,
          height: 80,
        },
        11,
        22
      )
    ).toMatchObject({
      dragType: "column",
      draggingColumnId: "col",
      sourceIndex: 1,
      insertIndex: 1,
      pointerX: 11,
      pointerY: 22,
    });
  });

  it("detects unchanged drag targets", () => {
    const card = buildCardDragFromPending(
      {
        dragType: "card",
        pointerId: 1,
        cardId: "c1",
        columnId: "col",
        index: 0,
        startX: 0,
        startY: 0,
        grabOffsetX: 0,
        grabOffsetY: 0,
        width: 1,
        height: 1,
      },
      1,
      2
    );
    expect(isSameCardDragTarget(card, "col", 0, 1, 2)).toBe(true);
    expect(isSameCardDragTarget(card, "other", 0, 1, 2)).toBe(false);

    const column = buildColumnDragFromPending(
      {
        dragType: "column",
        pointerId: 1,
        columnId: "col",
        sourceIndex: 0,
        startX: 0,
        startY: 0,
        grabOffsetX: 0,
        grabOffsetY: 0,
        width: 1,
        height: 1,
      },
      3,
      4
    );
    expect(isSameColumnDragTarget(column, 0, 3, 4)).toBe(true);
    expect(isSameColumnDragTarget(column, 1, 3, 4)).toBe(false);
  });
});
