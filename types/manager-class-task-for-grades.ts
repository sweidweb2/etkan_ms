export type ManagerClassTaskForGradesRow = {
  id: string;
  session_id: string;
  session_label: string;
  session_nb_order: number;
  title: string;
  max_grade: number | null;
  due_date: string | null;
  created_at: string | null;
};
