import { describe, expect, it } from "vitest";
import {
  isBackupStorageBucket,
  isSafeStorageObjectPath,
} from "@/lib/constants/backup-storage";

describe("backup storage helpers", () => {
  it("accepts known buckets", () => {
    expect(isBackupStorageBucket("projects")).toBe(true);
    expect(isBackupStorageBucket("blogs")).toBe(true);
    expect(isBackupStorageBucket("auther")).toBe(true);
    expect(isBackupStorageBucket("workshops")).toBe(true);
    expect(isBackupStorageBucket("registration")).toBe(true);
    expect(isBackupStorageBucket("student-task-uploads")).toBe(true);
    expect(isBackupStorageBucket("class-covers")).toBe(true);
    expect(isBackupStorageBucket("avatars")).toBe(true);
    expect(isBackupStorageBucket("unknown-bucket")).toBe(false);
  });

  it("rejects unsafe object paths", () => {
    expect(isSafeStorageObjectPath("folder/photo.png")).toBe(true);
    expect(isSafeStorageObjectPath("../secret.png")).toBe(false);
    expect(isSafeStorageObjectPath("/root.png")).toBe(false);
    expect(isSafeStorageObjectPath("folder//photo.png")).toBe(false);
    expect(isSafeStorageObjectPath("")).toBe(false);
  });
});
