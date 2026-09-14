import { describe, expect, it } from "vitest";
import {
  getCategoryContainer,
  isFollowUpDirty,
  moveCategoryBetweenContainers,
  partitionClassCategories,
  type FollowUpBoardState,
} from "@/lib/classes/follow-up-state";
import { saveClassFollowUpSchema } from "@/lib/validators/manager/save-class-follow-up";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

describe("partitionClassCategories", () => {
  it("splits links into in-progress and done id lists", () => {
    expect(
      partitionClassCategories([
        { category_id: A, status: "in_progress" },
        { category_id: B, status: "done" },
        { category_id: C, status: "in_progress" },
      ])
    ).toEqual({
      inProgressCategoryIds: [A, C],
      doneCategoryIds: [B],
    });
  });
});

describe("moveCategoryBetweenContainers", () => {
  const base: FollowUpBoardState = {
    inProgressCategoryIds: [A],
    doneCategoryIds: [B],
  };

  it("moves from pool into in progress", () => {
    expect(
      moveCategoryBetweenContainers(base, C, "pool", "in_progress")
    ).toEqual({
      inProgressCategoryIds: [A, C],
      doneCategoryIds: [B],
    });
  });

  it("moves from in progress to done", () => {
    expect(
      moveCategoryBetweenContainers(base, A, "in_progress", "done")
    ).toEqual({
      inProgressCategoryIds: [],
      doneCategoryIds: [B, A],
    });
  });

  it("returns to pool by removing from both lists", () => {
    expect(moveCategoryBetweenContainers(base, B, "done", "pool")).toEqual({
      inProgressCategoryIds: [A],
      doneCategoryIds: [],
    });
  });

  it("no-ops when from === to", () => {
    expect(
      moveCategoryBetweenContainers(base, A, "in_progress", "in_progress")
    ).toBe(base);
  });
});

describe("getCategoryContainer + isFollowUpDirty", () => {
  it("resolves container membership", () => {
    const state: FollowUpBoardState = {
      inProgressCategoryIds: [A],
      doneCategoryIds: [B],
    };
    expect(getCategoryContainer(state, A)).toBe("in_progress");
    expect(getCategoryContainer(state, B)).toBe("done");
    expect(getCategoryContainer(state, C)).toBe("pool");
  });

  it("detects dirty draft ignoring order", () => {
    const saved: FollowUpBoardState = {
      inProgressCategoryIds: [A, C],
      doneCategoryIds: [B],
    };
    expect(
      isFollowUpDirty(
        { inProgressCategoryIds: [C, A], doneCategoryIds: [B] },
        saved
      )
    ).toBe(false);
    expect(
      isFollowUpDirty(
        { inProgressCategoryIds: [A], doneCategoryIds: [B, C] },
        saved
      )
    ).toBe(true);
  });
});

describe("saveClassFollowUpSchema", () => {
  it("rejects overlapping in-progress and done ids", () => {
    const parsed = saveClassFollowUpSchema.safeParse({
      class_id: A,
      in_progress_category_ids: [B],
      done_category_ids: [B],
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts disjoint lists", () => {
    const parsed = saveClassFollowUpSchema.safeParse({
      class_id: A,
      in_progress_category_ids: [B],
      done_category_ids: [C],
    });
    expect(parsed.success).toBe(true);
  });
});
