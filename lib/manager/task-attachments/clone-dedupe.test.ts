import { describe, expect, it } from "vitest";
import {
  isCloneSourceAlreadyCopied,
  isDuplicateStoragePathError,
} from "@/lib/manager/task-attachments/clone-dedupe";

describe("isCloneSourceAlreadyCopied", () => {
  const sourceId = "11111111-1111-4111-8111-111111111111";
  const destPath = `task-attachments/class_task/abc/${sourceId}-notes.pdf`;

  it("matches exact dest path", () => {
    expect(
      isCloneSourceAlreadyCopied(sourceId, destPath, [
        { storage_path: destPath },
      ])
    ).toBe(true);
  });

  it("matches source id token in path", () => {
    expect(
      isCloneSourceAlreadyCopied(sourceId, destPath, [
        {
          storage_path: `task-attachments/class_task/abc/${sourceId}-other.pdf`,
        },
      ])
    ).toBe(true);
  });

  it("does not match unrelated same name/size style paths", () => {
    expect(
      isCloneSourceAlreadyCopied(sourceId, destPath, [
        {
          storage_path:
            "task-attachments/class_task/abc/99999999-9999-4999-8999-999999999999-notes.pdf",
        },
      ])
    ).toBe(false);
  });
});

describe("isDuplicateStoragePathError", () => {
  it("detects unique violations on storage_path", () => {
    expect(
      isDuplicateStoragePathError(
        'duplicate key value violates unique constraint "task_attachments_storage_path_key"'
      )
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isDuplicateStoragePathError("network timeout")).toBe(false);
  });
});
