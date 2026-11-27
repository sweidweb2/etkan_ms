import { describe, expect, it } from "vitest";
import { TASK_ATTACHMENT_MAX_FILES_SQL_MESSAGE } from "@/lib/constants/task-attachment-messages";
import { TASK_ATTACHMENT_MAX_FILES } from "@/lib/constants/task-attachments";

describe("task attachment SQL message parity", () => {
  it("derives from TASK_ATTACHMENT_MAX_FILES and matches the SQL exception", () => {
    expect(TASK_ATTACHMENT_MAX_FILES).toBe(10);
    expect(TASK_ATTACHMENT_MAX_FILES_SQL_MESSAGE).toBe(
      "Each task can have at most 10 attachments."
    );
  });
});
