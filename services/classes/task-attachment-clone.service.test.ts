import { beforeEach, describe, expect, it, vi } from "vitest";
import { TASK_ATTACHMENT_ENTITIES } from "@/lib/constants/task-attachments";
import * as cloneJobRepository from "@/repositories/task-attachment-clone-job.repository";
import * as taskAttachmentRepository from "@/repositories/task-attachment.repository";
import * as taskAttachmentStorageRepository from "@/repositories/task-attachment-storage.repository";
import { processPendingTaskAttachmentCloneJobs } from "@/services/classes/task-attachment-clone.service";

vi.mock("@/repositories/task-attachment-clone-job.repository");
vi.mock("@/repositories/task-attachment.repository");
vi.mock("@/repositories/task-attachment-storage.repository");

const adminClient = {} as never;
const jobId = "11111111-1111-4111-8111-111111111111";
const classTaskId = "22222222-2222-4222-8222-222222222222";
const subjectTaskId = "33333333-3333-4333-8333-333333333333";

describe("processPendingTaskAttachmentCloneJobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cloneJobRepository.resetStaleRunningCloneJobs).mockResolvedValue({
      error: null,
    } as never);
    vi.mocked(cloneJobRepository.requeueStaleFailedCloneJobs).mockResolvedValue({
      error: null,
    } as never);
  });

  it("fails the job when class task is at max files and sources remain", async () => {
    vi.mocked(cloneJobRepository.listPendingCloneJobs).mockResolvedValue({
      data: [{ id: jobId }],
      error: null,
    } as never);
    vi.mocked(cloneJobRepository.claimCloneJob).mockResolvedValue({
      data: {
        id: jobId,
        class_task_id: classTaskId,
        source_subject_task_id: subjectTaskId,
        status: "running",
      },
      error: null,
    } as never);
    vi.mocked(
      taskAttachmentRepository.listTaskAttachmentsByEntity
    ).mockImplementation(async (_client, entity) => {
      if (entity === TASK_ATTACHMENT_ENTITIES.SUBJECT_TASK) {
        return {
          data: [
            {
              id: "src-1",
              file_name: "a.pdf",
              storage_path: "subject/a.pdf",
            },
          ],
          error: null,
        } as never;
      }
      return {
        data: Array.from({ length: 10 }, (_, index) => ({
          id: `existing-${index}`,
          storage_path: `class/existing-${index}.pdf`,
        })),
        error: null,
      } as never;
    });
    vi.mocked(cloneJobRepository.failCloneJob).mockResolvedValue({
      error: null,
    } as never);

    await processPendingTaskAttachmentCloneJobs(adminClient);

    expect(cloneJobRepository.failCloneJob).toHaveBeenCalledWith(
      adminClient,
      jobId,
      expect.stringMatching(/maximum of 10/i)
    );
    expect(cloneJobRepository.completeCloneJob).not.toHaveBeenCalled();
  });

  it("fails when remaining capacity fills mid-copy with sources left", async () => {
    vi.mocked(cloneJobRepository.listPendingCloneJobs).mockResolvedValue({
      data: [{ id: jobId }],
      error: null,
    } as never);
    vi.mocked(cloneJobRepository.claimCloneJob).mockResolvedValue({
      data: {
        id: jobId,
        class_task_id: classTaskId,
        source_subject_task_id: subjectTaskId,
        status: "running",
      },
      error: null,
    } as never);
    vi.mocked(
      taskAttachmentRepository.listTaskAttachmentsByEntity
    ).mockImplementation(async (_client, entity) => {
      if (entity === TASK_ATTACHMENT_ENTITIES.SUBJECT_TASK) {
        return {
          data: [
            {
              id: "src-1",
              file_name: "a.pdf",
              storage_path: "subject/a.pdf",
              mime_type: "application/pdf",
              file_size: 10,
              sort_order: 0,
            },
            {
              id: "src-2",
              file_name: "b.pdf",
              storage_path: "subject/b.pdf",
              mime_type: "application/pdf",
              file_size: 10,
              sort_order: 1,
            },
          ],
          error: null,
        } as never;
      }
      return {
        data: Array.from({ length: 9 }, (_, index) => ({
          id: `existing-${index}`,
          storage_path: `class/existing-${index}.pdf`,
        })),
        error: null,
      } as never;
    });
    vi.mocked(
      taskAttachmentStorageRepository.downloadTaskAttachmentStorageObject
    ).mockResolvedValue({
      data: new Blob([Uint8Array.from([1, 2, 3])]),
      error: null,
    } as never);
    vi.mocked(
      taskAttachmentStorageRepository.uploadTaskAttachmentStorageObject
    ).mockResolvedValue({ error: null } as never);
    vi.mocked(taskAttachmentRepository.createTaskAttachment).mockResolvedValue({
      data: { id: "copied-1" },
      error: null,
    } as never);
    vi.mocked(cloneJobRepository.failCloneJob).mockResolvedValue({
      error: null,
    } as never);

    await processPendingTaskAttachmentCloneJobs(adminClient);

    expect(taskAttachmentRepository.createTaskAttachment).toHaveBeenCalledTimes(
      1
    );
    expect(cloneJobRepository.failCloneJob).toHaveBeenCalledWith(
      adminClient,
      jobId,
      expect.stringMatching(/Copied 1 file\(s\).*maximum of 10/i)
    );
    expect(cloneJobRepository.completeCloneJob).not.toHaveBeenCalled();
  });

  it("completes when there are no pending sources left to copy", async () => {
    vi.mocked(cloneJobRepository.listPendingCloneJobs).mockResolvedValue({
      data: [{ id: jobId }],
      error: null,
    } as never);
    vi.mocked(cloneJobRepository.claimCloneJob).mockResolvedValue({
      data: {
        id: jobId,
        class_task_id: classTaskId,
        source_subject_task_id: subjectTaskId,
        status: "running",
      },
      error: null,
    } as never);
    vi.mocked(
      taskAttachmentRepository.listTaskAttachmentsByEntity
    ).mockResolvedValue({
      data: [],
      error: null,
    } as never);
    vi.mocked(cloneJobRepository.completeCloneJob).mockResolvedValue({
      error: null,
    } as never);

    await processPendingTaskAttachmentCloneJobs(adminClient);

    expect(cloneJobRepository.completeCloneJob).toHaveBeenCalledWith(
      adminClient,
      jobId
    );
    expect(cloneJobRepository.failCloneJob).not.toHaveBeenCalled();
  });
});
