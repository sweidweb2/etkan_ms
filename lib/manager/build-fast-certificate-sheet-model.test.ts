import { describe, expect, it } from "vitest";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import { buildFastCertificateSheetModel } from "@/lib/manager/build-fast-certificate-sheet-model";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassTaskForGradesRow } from "@/types/manager-class-task-for-grades";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type { ManagerStudentClassTabDetail } from "@/types/manager-student-class-detail";

const classRow: ManagerClassRow = {
  id: "class-1",
  name: "Robotics A",
  subject_id: "subject-1",
  subject_name: "Robotics",
  subject_nb_sessions: 12,
  completed_sessions: 4,
  status: "completed",
  semester_id: "semester-1",
  semester_name: "Fall 2026",
  enrollment_count: 10,
  teacher_count: 1,
  image_url: null,
  card_gradient: "violet-aurora",
  created_at: "2026-01-01T00:00:00.000Z",
};

const student: ManagerClassStudentRow = {
  id: "enrollment-1",
  student_profile_id: "profile-1",
  user_id: "user-1",
  full_name: "Sara Ahmed",
  email: "sara@example.com",
  phone: null,
  joined_at: "2026-02-01T00:00:00.000Z",
};

const classTasks: ManagerClassTaskForGradesRow[] = [
  {
    id: "task-1",
    session_id: "session-1",
    session_label: "S1",
    session_nb_order: 1,
    title: "Worksheet 1",
    max_grade: 20,
    due_date: null,
    created_at: null,
  },
  {
    id: "task-2",
    session_id: "session-2",
    session_label: "S2",
    session_nb_order: 2,
    title: "Project",
    max_grade: 100,
    due_date: null,
    created_at: null,
  },
];

const detail: ManagerStudentClassTabDetail = {
  attendanceSlots: [],
  attendanceTrend: [],
  groupGradeSlots: [],
  tasks: [
    {
      student_task_id: "st-1",
      task_id: "task-1",
      session_id: "session-1",
      title: "Worksheet 1",
      due_date: null,
      max_grade: 20,
      status: STUDENT_TASK_STATUSES.GRADED,
      grade: 18,
      submitted_at: null,
      graded_at: null,
    },
    {
      student_task_id: "st-2",
      task_id: "task-2",
      session_id: "session-2",
      title: "Project",
      due_date: null,
      max_grade: 100,
      status: STUDENT_TASK_STATUSES.PENDING,
      grade: null,
      submitted_at: null,
      graded_at: null,
    },
  ],
  taskGradeTrend: [],
  courseGrade: null,
};

describe("buildFastCertificateSheetModel", () => {
  it("omits missing tasks and uses effective factor weights", () => {
    const model = buildFastCertificateSheetModel({
      student,
      classRow,
      detail,
      classTasks,
      finalExam: null,
      finalExamGrade: null,
      factorWeights: {
        tasksWeight: 100,
        finalExamWeight: 0,
      },
      taskWeights: { "task-1": "100" },
    });

    expect(model.taskRows).toHaveLength(1);
    expect(model.taskRows[0]?.title).toBe("Worksheet 1");
    expect(model.course.isComputed).toBe(false);
    expect(model.mainFactors.tasks.weight).toBe(100);
    expect(model.mainFactors.finalExam.weight).toBe(0);
    expect(model.mainFactors.previewTotal).toBe(90);
  });
});
