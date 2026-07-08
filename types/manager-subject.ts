export interface ManagerSubjectRow {
  id: string;
  name: string;
  syllabus_link: string | null;
  reference_link: string | null;
  handout_link: string | null;
  created_at: string;
  /** Preview aggregate until classes are loaded from backend. */
  class_count: number;
}
