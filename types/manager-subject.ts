export interface ManagerSubjectRow {
  id: string;
  name: string;
  syllabus_link: string | null;
  reference_link: string | null;
  handout_link: string | null;
  created_at: string;
  /** subjects.nb_sessions — planned curriculum session count. */
  nb_sessions: number;
  /** Preview aggregate until classes are loaded from backend. */
  class_count: number;
}
