import { describe, expect, it } from "vitest";
import { STUDENT_ATTENDANCE_STATUSES } from "@/lib/constants/manager-student-attendance-status";
import { STUDENT_TASK_STATUSES } from "@/lib/constants/manager-student-task-status";
import { buildStudentClassGradeSheetModel } from "@/lib/manager/student-class-grade-sheet";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassStudentGradeRow } from "@/types/manager-class-student-grade";
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
  created_at: "2026-01-01T00:00:00.000Z",
};

const student: ManagerClassStudentRow = {
  id: "enrollment-1",
  student_profile_id: "profile-1",
  user_id: "user-1",
  full_name: "Sara Ahmed",
  username: "sara",
  email: "sara@example.com",
  phone: null,
  joined_at: "2026-02-01T00:00:00.000Z",
};

const baseDetail: ManagerStudentClassTabDetail = {
  attendanceSlots: [
    {
      session_id: "session-1",
      session_label: "S1",
      session_at: "2026-07-10T10:00:00.000Z",
      status: STUDENT_ATTENDANCE_STATUSES.PRESENT,
    },
    {
      session_id: "session-2",
      session_label: "S2",
      session_at: "2026-07-17T10:00:00.000Z",
      status: STUDENT_ATTENDANCE_STATUSES.ABSENT,
    },
  ],
  attendanceTrend: [],
  groupGradeSlots: [
    {
      session_id: "session-1",
      session_label: "S1",
      session_at: "2026-07-10T10:00:00.000Z",
      nb_order: 1,
      group_grade_level: "high",
      group_grade_label: "High",
      group_grade_index: 3,
    },
    {
      session_id: "session-2",
      session_label: "S2",
      session_at: "2026-07-17T10:00:00.000Z",
      nb_order: 2,
      group_grade_level: "medium",
      group_grade_label: "Medium",
      group_grade_index: 2,
    },
  ],
  tasks: [
    {
      student_task_id: "st-1",
      task_id: "task-1",
      session_id: "session-1",
      title: "Build a robot arm",
      due_date: "2026-07-12T00:00:00.000Z",
      max_grade: 100,
      status: STUDENT_TASK_STATUSES.GRADED,
      grade: 90,
      submitted_at: "2026-07-11T00:00:00.000Z",
      graded_at: "2026-07-12T00:00:00.000Z",
    },
    {
      student_task_id: "st-2",
      task_id: "task-2",
      session_id: "session-2",
      title: "Sensor calibration",
      due_date: "2026-07-19T00:00:00.000Z",
      max_grade: 50,
      status: STUDENT_TASK_STATUSES.GRADED,
      grade: 45,
      submitted_at: "2026-07-18T00:00:00.000Z",
      graded_at: "2026-07-19T00:00:00.000Z",
    },
  ],
  taskGradeTrend: [],
  courseGrade: null,
};

describe("buildStudentClassGradeSheetModel", () => {
  it("builds a pending sheet with attendance summary, task rows, and group slots", () => {
    const gradeRow: ManagerClassStudentGradeRow = {
      student_profile_id: student.student_profile_id,
      user_id: student.user_id,
      full_name: student.full_name,
      username: student.username,
      email: student.email,
      phone: student.phone,
      enrollment_status: "Member",
      is_computed: false,
      total_grade: null,
      task_total_grade: 87.5,
      final_exam_grade: 85,
      missing_items: [],
    };

    const model = buildStudentClassGradeSheetModel({
      student,
      classRow,
      gradeRow,
      detail: baseDetail,
      finalExam: {
        id: "exam-1",
        class_id: classRow.id,
        title: "Final exam",
        description: null,
        due_date: null,
        max_grade: 100,
        created_at: "2026-07-01T00:00:00.000Z",
      },
      generatedAt: new Date("2026-07-12T00:00:00.000Z"),
    });

    expect(model.studentName).toBe("Sara Ahmed");
    expect(model.course.isComputed).toBe(false);
    expect(model.attendance).toEqual({ presentCount: 1, totalSessions: 2 });
    expect(model.groupGradeSlots).toEqual([
      { sessionLabel: "S1", gradeLabel: "High" },
      { sessionLabel: "S2", gradeLabel: "Medium" },
    ]);
    expect(model.taskRows).toHaveLength(2);
    expect(model.taskRows[0]?.title).toBe("Build a robot arm");
    expect(model.taskRows[0]?.grade).toBe(90);
    expect(model.mainFactors.tasks.grade).toBe(87.5);
    expect(model.mainFactors.finalExam.grade).toBe(85);
    expect(model.mainFactors.previewTotal).toBeCloseTo(86.5, 1);
  });

  it("prefers stored course grade json and totals for computed students", () => {
    const gradeRow: ManagerClassStudentGradeRow = {
      student_profile_id: student.student_profile_id,
      user_id: student.user_id,
      full_name: student.full_name,
      username: student.username,
      email: student.email,
      phone: student.phone,
      enrollment_status: "Member",
      is_computed: true,
      total_grade: 88,
      task_total_grade: 90,
      final_exam_grade: 85,
      missing_items: [],
    };

    const detail: ManagerStudentClassTabDetail = {
      ...baseDetail,
      courseGrade: {
        id: "grade-1",
        task_json_grade_weights: [],
        group_grades_json: [
          { session_id: "session-1", session_label: "S1", grade: 82 },
          { session_id: "session-2", session_label: "S2", grade: 76 },
        ],
        attendee_grades_json: [
          {
            session_id: "session-1",
            session_label: "S1",
            grade: 95,
            status: "present",
          },
          {
            session_id: "session-2",
            session_label: "S2",
            grade: 0,
            status: "absent",
          },
        ],
        task_weight: 60,
        task_total_grade: 90,
        final_exam_grade: 85,
        final_exam_weight: 40,
        type: "final",
        created_at: "2026-08-01T00:00:00.000Z",
      },
    };

    const model = buildStudentClassGradeSheetModel({
      student,
      classRow,
      gradeRow,
      detail,
      finalExam: null,
    });

    expect(model.course.isComputed).toBe(true);
    expect(model.course.computeType).toBe("final");
    expect(model.attendance).toEqual({ presentCount: 1, totalSessions: 2 });
    expect(model.groupGradeSlots[0]?.gradeLabel).toBe("82.0");
    expect(model.mainFactors.tasks.contribution).toBe(54);
    expect(model.mainFactors.finalExam.contribution).toBe(34);
    expect(model.mainFactors.previewTotal).toBe(88);
  });
});
