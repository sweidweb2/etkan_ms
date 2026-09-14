import { beforeEach, describe, expect, it, vi } from "vitest";
import { STUDENT_COMPUTED_GRADE_RECORD_LOCKED_ERROR } from "@/lib/manager/class-grades-access";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentCourseGradeRepository from "@/repositories/student-course-grade.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import * as studentTaskStorageRepository from "@/repositories/student-task-storage.repository";
import * as studentTaskUploadRepository from "@/repositories/student-task-upload.repository";
import * as taskRepository from "@/repositories/task.repository";
import * as auditLogService from "@/services/ops/audit-log.service";
import type { AuditActor } from "@/services/ops/audit-log.service";
import {
  deleteStudentTaskUploadForManager,
  getStudentTaskUploadSignedUrlForManager,
  uploadStudentTaskFileForManager,
} from "@/services/classes/student-task-upload.service";

vi.mock("@/repositories/session.repository");
vi.mock("@/repositories/student-course-grade.repository");
vi.mock("@/repositories/student-task.repository");
vi.mock("@/repositories/student-task-storage.repository");
vi.mock("@/repositories/student-task-upload.repository");
vi.mock("@/repositories/task.repository");
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/services/auth/authorization.service", () => ({
  UNAUTHORIZED_MESSAGE: "Unauthorized.",
  assertPermission: vi.fn(async (_c, userId) => {
    if (!userId) throw new Error("Unauthorized.");
  }),
  getUnauthorizedError: vi.fn(async (_c, userId) =>
    userId ? null : "Unauthorized."
  ),
}));

const adminClient = {} as never;
const actor: AuditActor = {
  userId: "11111111-1111-4111-8111-111111111111",
  userLabel: "Manager",
};

const classId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const sessionId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const taskId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const studentId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const studentTaskId = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1";
const uploadId = "b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2";

function mockUnlockedComputedGrades() {
  vi.mocked(
    studentCourseGradeRepository.findStudentCourseGradeByClassAndUser
  ).mockResolvedValue({ data: null, error: null } as never);
}

function makePdfFile(name = "homework.pdf", size = 1024) {
  return new File([new Uint8Array(size)], name, {
    type: "application/pdf",
  });
}

const studentTaskRecord = {
  id: studentTaskId,
  task_id: taskId,
  student_id: studentId,
  status: "pending",
  submitted_at: null,
  grade: null,
  notes: null,
  student_report: null,
  graded_at: null,
};

const uploadRecord = {
  id: uploadId,
  student_task_id: studentTaskId,
  storage_path: `student-task-uploads/${studentTaskId}/uuid-homework.pdf`,
  file_name: "homework.pdf",
  mime_type: "application/pdf",
  file_size: 1024,
  uploaded_by: actor.userId,
  created_at: "2026-09-14T10:00:00.000Z",
};

describe("uploadStudentTaskFileForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    mockUnlockedComputedGrades();
    vi.mocked(studentTaskRepository.findStudentTaskById).mockResolvedValue({
      data: studentTaskRecord,
      error: null,
    } as never);
    vi.mocked(taskRepository.findTaskById).mockResolvedValue({
      data: {
        id: taskId,
        session_id: sessionId,
        title: "Homework",
        description: null,
        due_date: null,
        max_grade: 20,
        created_at: "2026-07-01T00:00:00.000Z",
      },
      error: null,
    } as never);
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: {
        id: sessionId,
        class_id: classId,
      },
      error: null,
    } as never);
    vi.mocked(
      studentTaskUploadRepository.countStudentTaskUploadsByStudentTaskId
    ).mockResolvedValue({ count: 0, error: null } as never);
    vi.mocked(
      studentTaskStorageRepository.uploadStudentTaskStorageObject
    ).mockResolvedValue({ error: null });
    vi.mocked(
      studentTaskUploadRepository.createStudentTaskUpload
    ).mockResolvedValue({
      data: uploadRecord,
      error: null,
    } as never);
  });

  it("rejects unauthorized actors", async () => {
    const result = await uploadStudentTaskFileForManager(
      adminClient,
      null,
      actor,
      {
        student_task_id: studentTaskId,
        file: makePdfFile(),
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized.");
    }
  });

  it("rejects when the student already has 10 uploads", async () => {
    vi.mocked(
      studentTaskUploadRepository.countStudentTaskUploadsByStudentTaskId
    ).mockResolvedValue({ count: 10, error: null } as never);

    const result = await uploadStudentTaskFileForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_task_id: studentTaskId,
        file: makePdfFile(),
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/at most 10/i);
    }
    expect(
      studentTaskStorageRepository.uploadStudentTaskStorageObject
    ).not.toHaveBeenCalled();
  });

  it("rejects disallowed mime types", async () => {
    const result = await uploadStudentTaskFileForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_task_id: studentTaskId,
        file: new File([new Uint8Array(10)], "virus.exe", {
          type: "application/x-msdownload",
        }),
      }
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.file?.[0]).toMatch(/not allowed/i);
    }
  });

  it("rolls back storage when the DB insert fails", async () => {
    vi.mocked(
      studentTaskUploadRepository.createStudentTaskUpload
    ).mockResolvedValue({
      data: null,
      error: { message: "insert failed" },
    } as never);
    vi.mocked(
      studentTaskStorageRepository.removeStudentTaskStorageObjects
    ).mockResolvedValue({ error: null });

    const result = await uploadStudentTaskFileForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_task_id: studentTaskId,
        file: makePdfFile(),
      }
    );

    expect(result.success).toBe(false);
    expect(
      studentTaskStorageRepository.removeStudentTaskStorageObjects
    ).toHaveBeenCalled();
  });

  it("uploads a file for a student task", async () => {
    const result = await uploadStudentTaskFileForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_task_id: studentTaskId,
        file: makePdfFile(),
      }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.upload.id).toBe(uploadId);
      expect(result.taskId).toBe(taskId);
      expect(result.classId).toBe(classId);
      expect(result.message).toBe("File uploaded.");
    }
  });

  it("blocks upload when the student grade inputs are locked", async () => {
    vi.mocked(
      studentCourseGradeRepository.findStudentCourseGradeByClassAndUser
    ).mockResolvedValue({
      data: { id: "grade-1" },
      error: null,
    } as never);

    const result = await uploadStudentTaskFileForManager(
      adminClient,
      actor.userId,
      actor,
      {
        student_task_id: studentTaskId,
        file: makePdfFile(),
      }
    );

    expect(result).toEqual({
      success: false,
      error: STUDENT_COMPUTED_GRADE_RECORD_LOCKED_ERROR,
    });
  });
});

describe("deleteStudentTaskUploadForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(auditLogService.recordManagerAuditLog).mockResolvedValue(null);
    mockUnlockedComputedGrades();
    vi.mocked(
      studentTaskUploadRepository.findStudentTaskUploadById
    ).mockResolvedValue({
      data: uploadRecord,
      error: null,
    } as never);
    vi.mocked(studentTaskRepository.findStudentTaskById).mockResolvedValue({
      data: studentTaskRecord,
      error: null,
    } as never);
    vi.mocked(taskRepository.findTaskById).mockResolvedValue({
      data: {
        id: taskId,
        session_id: sessionId,
        title: "Homework",
        description: null,
        due_date: null,
        max_grade: 20,
        created_at: "2026-07-01T00:00:00.000Z",
      },
      error: null,
    } as never);
    vi.mocked(sessionRepository.findSessionById).mockResolvedValue({
      data: {
        id: sessionId,
        class_id: classId,
      },
      error: null,
    } as never);
    vi.mocked(
      studentTaskStorageRepository.removeStudentTaskStorageObjects
    ).mockResolvedValue({ error: null });
    vi.mocked(
      studentTaskUploadRepository.deleteStudentTaskUploadById
    ).mockResolvedValue({ error: null } as never);
  });

  it("deletes storage then the DB row", async () => {
    const result = await deleteStudentTaskUploadForManager(
      adminClient,
      actor.userId,
      actor,
      { id: uploadId }
    );

    expect(
      studentTaskStorageRepository.removeStudentTaskStorageObjects
    ).toHaveBeenCalledWith(adminClient, [uploadRecord.storage_path]);
    expect(
      studentTaskUploadRepository.deleteStudentTaskUploadById
    ).toHaveBeenCalledWith(adminClient, uploadId);
    expect(result.success).toBe(true);
  });
});

describe("getStudentTaskUploadSignedUrlForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(
      studentTaskUploadRepository.findStudentTaskUploadById
    ).mockResolvedValue({
      data: uploadRecord,
      error: null,
    } as never);
    vi.mocked(
      studentTaskStorageRepository.createStudentTaskUploadSignedUrl
    ).mockResolvedValue({
      data: { signedUrl: "https://example.com/signed.pdf" },
      error: null,
    });
  });

  it("returns a signed URL", async () => {
    const result = await getStudentTaskUploadSignedUrlForManager(
      adminClient,
      actor.userId,
      { id: uploadId }
    );

    expect(result).toEqual({
      success: true,
      signedUrl: "https://example.com/signed.pdf",
    });
  });
});
