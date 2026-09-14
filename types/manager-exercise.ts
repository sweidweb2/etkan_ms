import type { ExerciseLevelValue } from "@/lib/constants/exercise-level";
import type { ExerciseStatusValue } from "@/lib/constants/exercise-status";
import type { FieldErrors } from "@/types/auth";
import type { Json } from "@/types/supabase";

export type ManagerExerciseRow = {
  id: string;
  title: string;
  body: Json;
  level: ExerciseLevelValue;
  status: ExerciseStatusValue;
  categories: string[];
  category_ids: string[];
  created_at: string;
  updated_at: string;
};

export type CreateExerciseActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  exercise?: ManagerExerciseRow;
};

export type UpdateExerciseActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  exercise?: ManagerExerciseRow;
};

export type DeleteExerciseActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export type SyncSubjectCatalogLinksActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
};
