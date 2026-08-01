import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  buildComputedGradeCertificatesZipBlob,
  getGradeCertificatesZipFilename,
} from "@/lib/export/student-grade-certificates-zip-export";
import type { ComputedStudentGradeSheetBundle } from "@/services/student-course-grade.service";
import type { ManagerClassRow } from "@/types/manager-class-list";

const classRow: ManagerClassRow = {
  id: "class-1",
  name: "Robotics A",
  subject_id: "subject-1",
  subject_name: "Robotics",
  subject_nb_sessions: 8,
  completed_sessions: 4,
  status: "completed",
  semester_id: "semester-1",
  semester_name: "Fall 2026",
  enrollment_count: 2,
  teacher_count: 1,
  created_at: "2026-01-01T00:00:00.000Z",
};

const bundle: ComputedStudentGradeSheetBundle = {
  student: {
    id: "enrollment-1",
    student_profile_id: "profile-1",
    user_id: "user-1",
    full_name: "Sara Ahmed",
    username: "sara",
    email: "sara@example.com",
    phone: null,
    joined_at: "2026-02-01T00:00:00.000Z",
  },
  gradeRow: {
    student_profile_id: "profile-1",
    user_id: "user-1",
    full_name: "Sara Ahmed",
    username: "sara",
    email: "sara@example.com",
    phone: null,
    enrollment_status: "Member",
    is_computed: true,
    total_grade: 86.5,
    task_total_grade: 87.5,
    final_exam_grade: 85,
    missing_items: [],
  },
  detail: {
    attendanceSlots: [],
    attendanceTrend: [],
    groupGradeSlots: [],
    tasks: [
      {
        student_task_id: "st-1",
        task_id: "task-1",
        session_id: "session-1",
        title: "Build a robot arm",
        due_date: null,
        max_grade: 100,
        status: "graded",
        grade: 90,
        submitted_at: null,
        graded_at: "2026-07-12T00:00:00.000Z",
      },
    ],
    taskGradeTrend: [],
    courseGrade: {
      id: "grade-1",
      task_json_grade_weights: [],
      group_grades_json: [],
      attendee_grades_json: [],
      task_weight: 60,
      task_total_grade: 87.5,
      final_exam_grade: 85,
      final_exam_weight: 40,
      type: "final",
      created_at: "2026-08-01T00:00:00.000Z",
    },
  },
  classTasks: [],
  finalExam: {
    id: "exam-1",
    class_id: classRow.id,
    title: "Final exam",
    description: null,
    due_date: null,
    max_grade: 100,
    created_at: "2026-07-01T00:00:00.000Z",
  },
};

describe("student grade certificates zip export", () => {
  it("builds a safe zip filename slug", () => {
    expect(getGradeCertificatesZipFilename("Robotics A")).toMatch(
      /^robotics-a-grade-certificates-\d{4}-\d{2}-\d{2}\.zip$/
    );
  });

  it("builds a zip archive with one pdf per computed student", async () => {
    const { blob, count } = await buildComputedGradeCertificatesZipBlob({
      classRow,
      bundles: [bundle],
    });

    expect(count).toBe(1);

    const archive = await JSZip.loadAsync(await blob.arrayBuffer());
    const pdfNames = Object.keys(archive.files).filter(
      (name) => !archive.files[name]?.dir
    );

    expect(pdfNames).toHaveLength(1);
    expect(pdfNames[0]).toMatch(/^sara-ahmed-grade-sheet-\d{4}-\d{2}-\d{2}\.pdf$/);

    const pdfBytes = await archive.file(pdfNames[0]!)!.async("uint8array");
    expect(pdfBytes.length).toBeGreaterThan(100);
    expect(String.fromCharCode(...pdfBytes.slice(0, 4))).toBe("%PDF");
  });
});
