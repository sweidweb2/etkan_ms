import type { ManagerCategoryRow } from "@/types/manager-category";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { FollowUpBoardState } from "@/lib/classes/follow-up-state";
import type { FieldErrors } from "@/types/auth";

export type ClassFollowUpPayload = {
  classRow: ManagerClassRow;
  categories: ManagerCategoryRow[];
  board: FollowUpBoardState;
};

export type SaveClassFollowUpActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
};
