import {
  CLASS_CATEGORY_STATUSES,
  type ClassCategoryStatusValue,
} from "@/lib/constants/class-category-status";

export type FollowUpContainer = "pool" | "in_progress" | "done";

export type FollowUpBoardState = {
  inProgressCategoryIds: string[];
  doneCategoryIds: string[];
};

export type ClassCategoryLink = {
  category_id: string;
  status: ClassCategoryStatusValue | string;
};

export function partitionClassCategories(
  links: readonly ClassCategoryLink[]
): FollowUpBoardState {
  const inProgressCategoryIds: string[] = [];
  const doneCategoryIds: string[] = [];

  for (const link of links) {
    if (link.status === CLASS_CATEGORY_STATUSES.DONE) {
      doneCategoryIds.push(link.category_id);
    } else if (link.status === CLASS_CATEGORY_STATUSES.IN_PROGRESS) {
      inProgressCategoryIds.push(link.category_id);
    }
  }

  return { inProgressCategoryIds, doneCategoryIds };
}

export function getAssignedCategoryIds(state: FollowUpBoardState): Set<string> {
  return new Set([
    ...state.inProgressCategoryIds,
    ...state.doneCategoryIds,
  ]);
}

export function getCategoryContainer(
  state: FollowUpBoardState,
  categoryId: string
): FollowUpContainer {
  if (state.inProgressCategoryIds.includes(categoryId)) {
    return "in_progress";
  }
  if (state.doneCategoryIds.includes(categoryId)) {
    return "done";
  }
  return "pool";
}

export function moveCategoryBetweenContainers(
  state: FollowUpBoardState,
  categoryId: string,
  from: FollowUpContainer,
  to: FollowUpContainer
): FollowUpBoardState {
  if (from === to) {
    return state;
  }

  const without = {
    inProgressCategoryIds: state.inProgressCategoryIds.filter(
      (id) => id !== categoryId
    ),
    doneCategoryIds: state.doneCategoryIds.filter((id) => id !== categoryId),
  };

  if (to === "pool") {
    return without;
  }

  if (to === "in_progress") {
    return {
      ...without,
      inProgressCategoryIds: [...without.inProgressCategoryIds, categoryId],
    };
  }

  return {
    ...without,
    doneCategoryIds: [...without.doneCategoryIds, categoryId],
  };
}

function sortedKey(ids: readonly string[]): string {
  return [...ids].sort().join(",");
}

export function isFollowUpDirty(
  draft: FollowUpBoardState,
  saved: FollowUpBoardState
): boolean {
  return (
    sortedKey(draft.inProgressCategoryIds) !==
      sortedKey(saved.inProgressCategoryIds) ||
    sortedKey(draft.doneCategoryIds) !== sortedKey(saved.doneCategoryIds)
  );
}
