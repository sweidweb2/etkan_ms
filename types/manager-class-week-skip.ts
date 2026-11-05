import type { ClassWeekSkipState } from "@/lib/manager/class-week-skips";
import type { FieldErrors } from "@/types/auth";
import type { ManagerClassSessionRow } from "@/types/manager-class-session";

export type {
  ClassWeekSkipState,
  ClassWeekSlot,
  LatestSessionSkip,
} from "@/lib/manager/class-week-skips";

export type SkipClassWeekActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  weekSkipState?: ClassWeekSkipState;
  deletedSessionId?: string | null;
};

export type UnskipClassWeekActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  weekSkipState?: ClassWeekSkipState;
  createdSession?: ManagerClassSessionRow | null;
};
