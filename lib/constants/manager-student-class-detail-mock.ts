import { STUDENT_ATTENDANCE_STATUSES } from "@/lib/constants/manager-student-attendance-status";
import type { StudentAttendanceStatusValue } from "@/lib/constants/manager-student-attendance-status";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import { buildStudentGroupGradeSlots } from "@/lib/manager/class-group-grade-analytics";
import { SESSION_GROUP_GRADE_LEVELS } from "@/types/manager-session-group-grade";
import type { ManagerStudentClassTabDetail } from "@/types/manager-student-class-detail";
import type { ManagerStudentCourseGrade } from "@/types/manager-student-course-grade";

function buildAttendanceDetail(
  sessions: Array<{
    id: string;
    label: string;
    at: string;
    status: StudentAttendanceStatusValue;
  }>
): Pick<ManagerStudentClassTabDetail, "attendanceSlots" | "attendanceTrend"> {
  let cumulativePresent = 0;
  let streak = 0;

  const attendanceTrend = sessions.map((session) => {
    if (session.status === STUDENT_ATTENDANCE_STATUSES.PRESENT) {
      cumulativePresent += 1;
      streak += 1;
    } else {
      streak = 0;
    }

    return {
      session_label: session.label,
      cumulative_present: cumulativePresent,
      cumulative_rate: Math.round((cumulativePresent / sessions.length) * 100),
      streak,
    };
  });

  return {
    attendanceSlots: sessions.map((session) => ({
      session_id: session.id,
      session_label: session.label,
      session_at: session.at,
      status: session.status,
    })),
    attendanceTrend,
  };
}

const SARA_MATH_COURSE_GRADE: ManagerStudentCourseGrade = {
  id: "scg-sara-math-adv",
  task_json_grade_weights: [
    { key: "final_exams", label: "Final exams", weight: 40 },
    { key: "total_tasks", label: "Total tasks", weight: 60 },
  ],
  group_grades_json: [
    { session_id: "sess-01", session_label: "S1", grade: 81 },
    { session_id: "sess-02", session_label: "S2", grade: 86 },
    { session_id: "sess-03", session_label: "S3", grade: 88 },
  ],
  attendee_grades_json: [
    { session_id: "sess-01", session_label: "S1", grade: 90, status: "present" },
    { session_id: "sess-02", session_label: "S2", grade: 86, status: "present" },
    { session_id: "sess-03", session_label: "S3", grade: 88, status: "present" },
  ],
  task_weight: 60,
  task_total_grade: 82.5,
  final_exam_grade: 78,
  final_exam_weight: 40,
  type: "semester_1",
  created_at: "2025-11-20T10:00:00.000Z",
};

const DEFAULT_COURSE_GRADE: ManagerStudentCourseGrade = {
  id: "scg-default",
  task_json_grade_weights: [
    { key: "final_exams", label: "Final exams", weight: 40 },
    { key: "total_tasks", label: "Total tasks", weight: 60 },
  ],
  group_grades_json: [
    { session_id: "sess-01", session_label: "S1", grade: 70 },
    { session_id: "sess-02", session_label: "S2", grade: 74 },
  ],
  attendee_grades_json: [
    { session_id: "sess-01", session_label: "S1", grade: 78, status: "present" },
    { session_id: "sess-02", session_label: "S2", grade: 82, status: "present" },
  ],
  task_weight: 60,
  task_total_grade: 74,
  final_exam_grade: null,
  final_exam_weight: 40,
  type: "midterm",
  created_at: "2025-10-15T09:30:00.000Z",
};

const SARA_MATH_GROUP_GRADE_SESSIONS = [
  {
    id: "sess-01",
    nb_order: 1,
    starts_at: "2025-09-15T08:00:00.000Z",
    group_grade_level: SESSION_GROUP_GRADE_LEVELS.LOW,
  },
  {
    id: "sess-02",
    nb_order: 2,
    starts_at: "2025-09-22T08:00:00.000Z",
    group_grade_level: SESSION_GROUP_GRADE_LEVELS.MEDIUM,
  },
  {
    id: "sess-03",
    nb_order: 3,
    starts_at: "2025-09-29T08:00:00.000Z",
    group_grade_level: SESSION_GROUP_GRADE_LEVELS.HIGH,
  },
];

const SARA_MATH: ManagerStudentClassTabDetail = {
  ...buildAttendanceDetail([
    {
      id: "sess-01",
      label: "S1",
      at: "2025-09-15T08:00:00.000Z",
      status: STUDENT_ATTENDANCE_STATUSES.PRESENT,
    },
    {
      id: "sess-02",
      label: "S2",
      at: "2025-09-22T08:00:00.000Z",
      status: STUDENT_ATTENDANCE_STATUSES.PRESENT,
    },
    {
      id: "sess-03",
      label: "S3",
      at: "2025-09-29T08:00:00.000Z",
      status: STUDENT_ATTENDANCE_STATUSES.PRESENT,
    },
    {
      id: "sess-04",
      label: "S4",
      at: "2025-10-06T08:00:00.000Z",
      status: STUDENT_ATTENDANCE_STATUSES.PRESENT,
    },
    {
      id: "sess-05",
      label: "S5",
      at: "2025-10-13T08:00:00.000Z",
      status: STUDENT_ATTENDANCE_STATUSES.ABSENT,
    },
    {
      id: "sess-06",
      label: "S6",
      at: "2025-10-20T08:00:00.000Z",
      status: STUDENT_ATTENDANCE_STATUSES.PRESENT,
    },
    {
      id: "sess-07",
      label: "S7",
      at: "2025-10-27T08:00:00.000Z",
      status: STUDENT_ATTENDANCE_STATUSES.PRESENT,
    },
    {
      id: "sess-08",
      label: "S8",
      at: "2025-11-03T08:00:00.000Z",
      status: STUDENT_ATTENDANCE_STATUSES.ABSENT,
    },
    {
      id: "sess-09",
      label: "S9",
      at: "2025-11-10T08:00:00.000Z",
      status: STUDENT_ATTENDANCE_STATUSES.PRESENT,
    },
    {
      id: "sess-10",
      label: "S10",
      at: "2025-11-17T08:00:00.000Z",
      status: STUDENT_ATTENDANCE_STATUSES.PRESENT,
    },
  ]),
  groupGradeSlots: buildStudentGroupGradeSlots(SARA_MATH_GROUP_GRADE_SESSIONS),
  tasks: [
    {
      student_task_id: "st-1",
      task_id: "task-1",
      session_id: "sess-02",
      title: "Linear equations worksheet",
      due_date: "2025-09-25T23:59:00.000Z",
      max_grade: 20,
      status: STUDENT_TASK_STATUSES.GRADED,
      grade: 18,
      submitted_at: "2025-09-24T14:00:00.000Z",
      graded_at: "2025-09-26T09:00:00.000Z",
    },
    {
      student_task_id: "st-2",
      task_id: "task-2",
      session_id: "sess-04",
      title: "Quadratic functions quiz",
      due_date: "2025-10-10T23:59:00.000Z",
      max_grade: 25,
      status: STUDENT_TASK_STATUSES.GRADED,
      grade: 22,
      submitted_at: "2025-10-09T11:30:00.000Z",
      graded_at: "2025-10-11T08:00:00.000Z",
    },
    {
      student_task_id: "st-3",
      task_id: "task-3",
      session_id: "sess-06",
      title: "Polynomials homework",
      due_date: "2025-10-24T23:59:00.000Z",
      max_grade: 15,
      status: STUDENT_TASK_STATUSES.SUBMITTED,
      grade: null,
      submitted_at: "2025-10-23T16:45:00.000Z",
      graded_at: null,
    },
    {
      student_task_id: "st-4",
      task_id: "task-4",
      session_id: "sess-08",
      title: "Midterm review sheet",
      due_date: "2025-11-05T23:59:00.000Z",
      max_grade: 30,
      status: STUDENT_TASK_STATUSES.LATE,
      grade: 24,
      submitted_at: "2025-11-07T10:00:00.000Z",
      graded_at: "2025-11-08T12:00:00.000Z",
    },
    {
      student_task_id: "st-5",
      task_id: "task-5",
      session_id: "sess-09",
      title: "Systems of equations lab",
      due_date: "2025-11-18T23:59:00.000Z",
      max_grade: 20,
      status: STUDENT_TASK_STATUSES.PENDING,
      grade: null,
      submitted_at: null,
      graded_at: null,
    },
    {
      student_task_id: "st-6",
      task_id: "task-6",
      session_id: "sess-07",
      title: "Factoring practice",
      due_date: "2025-10-30T23:59:00.000Z",
      max_grade: 10,
      status: STUDENT_TASK_STATUSES.MISSING,
      grade: null,
      submitted_at: null,
      graded_at: null,
    },
  ],
  taskGradeTrend: [
    {
      task_label: "Linear eq.",
      grade: 18,
      max_grade: 20,
      graded_at: "2025-09-26T09:00:00.000Z",
    },
    {
      task_label: "Quadratic",
      grade: 22,
      max_grade: 25,
      graded_at: "2025-10-11T08:00:00.000Z",
    },
    {
      task_label: "Midterm",
      grade: 24,
      max_grade: 30,
      graded_at: "2025-11-08T12:00:00.000Z",
    },
  ],
  courseGrade: SARA_MATH_COURSE_GRADE,
};

const DEFAULT_DETAIL: ManagerStudentClassTabDetail = {
  ...buildAttendanceDetail([
    {
      id: "sess-a",
      label: "S1",
      at: "2025-09-20T09:00:00.000Z",
      status: STUDENT_ATTENDANCE_STATUSES.PRESENT,
    },
    {
      id: "sess-b",
      label: "S2",
      at: "2025-09-27T09:00:00.000Z",
      status: STUDENT_ATTENDANCE_STATUSES.PRESENT,
    },
    {
      id: "sess-c",
      label: "S3",
      at: "2025-10-04T09:00:00.000Z",
      status: STUDENT_ATTENDANCE_STATUSES.ABSENT,
    },
    {
      id: "sess-d",
      label: "S4",
      at: "2025-10-11T09:00:00.000Z",
      status: STUDENT_ATTENDANCE_STATUSES.PRESENT,
    },
    {
      id: "sess-e",
      label: "S5",
      at: "2025-10-18T09:00:00.000Z",
      status: STUDENT_ATTENDANCE_STATUSES.ABSENT,
    },
  ]),
  groupGradeSlots: buildStudentGroupGradeSlots([
    {
      id: "sess-a",
      nb_order: 1,
      starts_at: "2025-09-20T09:00:00.000Z",
      group_grade_level: SESSION_GROUP_GRADE_LEVELS.MEDIUM,
    },
    {
      id: "sess-b",
      nb_order: 2,
      starts_at: "2025-09-27T09:00:00.000Z",
      group_grade_level: SESSION_GROUP_GRADE_LEVELS.HIGH,
    },
  ]),
  tasks: [
    {
      student_task_id: "st-d1",
      task_id: "task-d1",
      session_id: "sess-a",
      title: "Intro assignment",
      due_date: "2025-09-25T23:59:00.000Z",
      max_grade: 20,
      status: STUDENT_TASK_STATUSES.GRADED,
      grade: 16,
      submitted_at: "2025-09-24T12:00:00.000Z",
      graded_at: "2025-09-26T10:00:00.000Z",
    },
    {
      student_task_id: "st-d2",
      task_id: "task-d2",
      session_id: "sess-c",
      title: "Reading summary",
      due_date: "2025-10-08T23:59:00.000Z",
      max_grade: 15,
      status: STUDENT_TASK_STATUSES.GRADED,
      grade: 13,
      submitted_at: "2025-10-07T18:00:00.000Z",
      graded_at: "2025-10-09T09:00:00.000Z",
    },
    {
      student_task_id: "st-d3",
      task_id: "task-d3",
      session_id: "sess-e",
      title: "Weekly reflection",
      due_date: "2025-10-22T23:59:00.000Z",
      max_grade: 10,
      status: STUDENT_TASK_STATUSES.PENDING,
      grade: null,
      submitted_at: null,
      graded_at: null,
    },
  ],
  taskGradeTrend: [
    {
      task_label: "Intro",
      grade: 16,
      max_grade: 20,
      graded_at: "2025-09-26T10:00:00.000Z",
    },
    {
      task_label: "Reading",
      grade: 13,
      max_grade: 15,
      graded_at: "2025-10-09T09:00:00.000Z",
    },
  ],
  courseGrade: DEFAULT_COURSE_GRADE,
};

/** Preview class tab detail keyed by `${user_id}:${class_id}`. */
export const MANAGER_STUDENT_CLASS_DETAIL_MOCK: Record<
  string,
  ManagerStudentClassTabDetail
> = {
  "a1b2c3d4-e5f6-7890-abcd-ef1234567890:cls-math-adv": SARA_MATH,
};

export function getDefaultStudentClassTabDetail(): ManagerStudentClassTabDetail {
  return {
    attendanceSlots: DEFAULT_DETAIL.attendanceSlots.map((slot) => ({ ...slot })),
    attendanceTrend: DEFAULT_DETAIL.attendanceTrend.map((point) => ({ ...point })),
    groupGradeSlots: DEFAULT_DETAIL.groupGradeSlots.map((slot) => ({ ...slot })),
    tasks: DEFAULT_DETAIL.tasks.map((task) => ({ ...task })),
    taskGradeTrend: DEFAULT_DETAIL.taskGradeTrend.map((point) => ({ ...point })),
    courseGrade: DEFAULT_DETAIL.courseGrade
      ? {
          ...DEFAULT_DETAIL.courseGrade,
          task_json_grade_weights:
            DEFAULT_DETAIL.courseGrade.task_json_grade_weights.map((rule) => ({
              ...rule,
            })),
        }
      : null,
  };
}
