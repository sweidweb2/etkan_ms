import type { ClassStatusValue } from "@/lib/constants/manager-class-status";

/** Full classes row for manager manage-classes page (classes table preview). */
export interface ManagerClassRow {
  id: string;
  name: string;
  subject_id: string;
  subject_name: string;
  subject_nb_sessions: number;
  completed_sessions: number;
  status: ClassStatusValue;
  semester_id: string | null;
  semester_name: string | null;
  image_url: string | null;
  /** Key from `CLASS_CARD_GRADIENTS` (`classes.card_gradient`). */
  card_gradient: string;
  enrollment_count: number;
  teacher_count: number;
  created_at: string;
}

export type ManagerClassStatusCounts = Record<ClassStatusValue, number>;

export type ManagerClassesListQuery = {
  page?: number;
  pageSize?: number;
  status?: ClassStatusValue | null;
  semesterId?: string | null;
  /** Only classes with no semester (ignored when `semesterId` is set). */
  unlinkedSemester?: boolean;
  search?: string;
};

export type ManagerClassesListData = {
  classes: ManagerClassRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  status: ClassStatusValue | null;
  semesterId: string | null;
  unlinkedSemester: boolean;
  search: string;
  /** Global per-status counts (not affected by filters). */
  statusCounts: ManagerClassStatusCounts;
};
