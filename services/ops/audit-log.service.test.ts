import { beforeEach, describe, expect, it, vi } from "vitest";
import * as auditLogRepository from "@/repositories/audit-log.repository";
import {
  __resetAfterSchedulerForTests,
  __setAfterSchedulerForTests,
} from "@/lib/ops/schedule-after-response";
import {
  createAuditLogForManager,
  deleteAuditLogsForManager,
  recordManagerAuditLog,
} from "@/services/ops/audit-log.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

vi.mock("@/repositories/audit-log.repository", () => ({
  createAuditLog: vi.fn(),
  deleteAuditLogsByIds: vi.fn(),
  listAuditLogs: vi.fn(),
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

const adminClient = {} as SupabaseClient<Database>;
const actor = { userId: "user-1", userLabel: "Manager One" };

describe("createAuditLogForManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mapped row on success", async () => {
    vi.mocked(auditLogRepository.createAuditLog).mockResolvedValue({
      data: {
        id: "log-1",
        user_id: "user-1",
        user_label: "Manager One",
        action: "insert",
        severity: "info",
        table_name: "notifications",
        record_id: "n-1",
        old_data: null,
        new_data: { title: "Hello" },
        metadata: { note: "created" },
        created_at: "2026-07-10T00:00:00.000Z",
      },
      error: null,
    } as never);

    const result = await createAuditLogForManager(adminClient, {
      user_id: "user-1",
      user_label: "Manager One",
      action: "insert",
      severity: "info",
      table_name: "notifications",
      record_id: "n-1",
      new_data: { title: "Hello" },
      metadata: { note: "created" },
    });

    expect(result?.id).toBe("log-1");
    expect(result?.action).toBe("insert");
    expect(result?.severity).toBe("info");
    expect(result?.table_name).toBe("notifications");
    expect(auditLogRepository.createAuditLog).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        severity: "info",
      })
    );
  });

  it("defaults severity to info when omitted", async () => {
    vi.mocked(auditLogRepository.createAuditLog).mockResolvedValue({
      data: {
        id: "log-1b",
        user_id: "user-1",
        user_label: "Manager One",
        action: "insert",
        severity: "info",
        table_name: "subjects",
        record_id: "s-1",
        old_data: null,
        new_data: null,
        metadata: null,
        created_at: "2026-07-10T00:00:00.000Z",
      },
      error: null,
    } as never);

    await createAuditLogForManager(adminClient, {
      user_label: "Manager One",
      action: "insert",
      table_name: "subjects",
    });

    expect(auditLogRepository.createAuditLog).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        severity: "info",
      })
    );
  });

  it("returns null when repository fails", async () => {
    vi.mocked(auditLogRepository.createAuditLog).mockResolvedValue({
      data: null,
      error: { message: "db error" },
    } as never);

    const result = await createAuditLogForManager(adminClient, {
      user_label: "Manager One",
      action: "insert",
      table_name: "notifications",
    });

    expect(result).toBeNull();
  });
});

describe("recordManagerAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetAfterSchedulerForTests();
  });

  it("records audit entry with actor fields and severity", async () => {
    vi.mocked(auditLogRepository.createAuditLog).mockResolvedValue({
      data: {
        id: "log-2",
        user_id: "user-1",
        user_label: "Manager One",
        action: "update",
        severity: "warning",
        table_name: "payments",
        record_id: "pay-1",
        old_data: null,
        new_data: null,
        metadata: { note: "updated" },
        created_at: "2026-07-10T00:00:00.000Z",
      },
      error: null,
    } as never);

    const result = await recordManagerAuditLog(adminClient, actor, {
      action: "update",
      severity: "warning",
      table_name: "payments",
      record_id: "pay-1",
      metadata: { note: "updated" },
    });

    expect(result?.id).toBe("log-2");
    expect(result?.severity).toBe("warning");
    expect(auditLogRepository.createAuditLog).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        user_id: "user-1",
        user_label: "Manager One",
        action: "update",
        severity: "warning",
        table_name: "payments",
        record_id: "pay-1",
      })
    );
  });

  it("defaults severity to info when callers omit it", async () => {
    vi.mocked(auditLogRepository.createAuditLog).mockResolvedValue({
      data: {
        id: "log-2b",
        user_id: "user-1",
        user_label: "Manager One",
        action: "update",
        severity: "info",
        table_name: "classes",
        record_id: "class-1",
        old_data: null,
        new_data: null,
        metadata: { note: "updated" },
        created_at: "2026-07-10T00:00:00.000Z",
      },
      error: null,
    } as never);

    await recordManagerAuditLog(adminClient, actor, {
      action: "update",
      table_name: "classes",
      record_id: "class-1",
      metadata: { note: "updated" },
    });

    expect(auditLogRepository.createAuditLog).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        severity: "info",
      })
    );
  });

  it("does not throw when audit insert fails", async () => {
    vi.mocked(auditLogRepository.createAuditLog).mockRejectedValue(
      new Error("boom")
    );

    await expect(
      recordManagerAuditLog(adminClient, actor, {
        action: "delete",
        severity: "critical",
        table_name: "notifications",
        record_id: "n-1",
      })
    ).resolves.toBeNull();
  });

  it("does not throw when repository returns an error", async () => {
    vi.mocked(auditLogRepository.createAuditLog).mockResolvedValue({
      data: null,
      error: { message: "insert failed" },
    } as never);

    await expect(
      recordManagerAuditLog(adminClient, actor, {
        action: "insert",
        table_name: "subjects",
      })
    ).resolves.toBeNull();
  });

  it("defers the insert when after() is available", async () => {
    vi.mocked(auditLogRepository.createAuditLog).mockResolvedValue({
      data: {
        id: "log-deferred",
        user_id: "user-1",
        user_label: "Manager One",
        action: "insert",
        severity: "info",
        table_name: "subjects",
        record_id: "s-1",
        old_data: null,
        new_data: null,
        metadata: null,
        created_at: "2026-07-10T00:00:00.000Z",
      },
      error: null,
    } as never);

    const deferredTasks: Array<() => void | Promise<void>> = [];
    __setAfterSchedulerForTests((task) => {
      deferredTasks.push(task);
    });

    const result = await recordManagerAuditLog(adminClient, actor, {
      action: "insert",
      table_name: "subjects",
      record_id: "s-1",
    });

    expect(result).toBeNull();
    expect(auditLogRepository.createAuditLog).not.toHaveBeenCalled();

    await deferredTasks[0]?.();

    expect(auditLogRepository.createAuditLog).toHaveBeenCalledTimes(1);
  });
});

describe("deleteAuditLogsForManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetAfterSchedulerForTests();
    vi.mocked(auditLogRepository.createAuditLog).mockResolvedValue({
      data: null,
      error: null,
    } as never);
  });

  it("rejects when the actor is not authorized", async () => {
    const result = await deleteAuditLogsForManager(
      adminClient,
      null,
      actor,
      ["log-1"]
    );

    expect(result).toEqual({ success: false, error: "Unauthorized." });
    expect(auditLogRepository.deleteAuditLogsByIds).not.toHaveBeenCalled();
  });

  it("deletes the given ids and records a critical audit entry", async () => {
    vi.mocked(auditLogRepository.deleteAuditLogsByIds).mockResolvedValue({
      data: [{ id: "log-1" }, { id: "log-2" }],
      error: null,
    } as never);

    const result = await deleteAuditLogsForManager(
      adminClient,
      "user-1",
      actor,
      ["log-1", "log-2"]
    );

    expect(result).toEqual({
      success: true,
      message: "2 logs deleted.",
      deleted_ids: ["log-1", "log-2"],
    });
    expect(auditLogRepository.deleteAuditLogsByIds).toHaveBeenCalledWith(
      adminClient,
      ["log-1", "log-2"]
    );
    expect(auditLogRepository.createAuditLog).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        action: "delete",
        severity: "critical",
        table_name: "audit_logs",
      })
    );
  });

  it("returns an error when nothing was deleted", async () => {
    vi.mocked(auditLogRepository.deleteAuditLogsByIds).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    const result = await deleteAuditLogsForManager(
      adminClient,
      "user-1",
      actor,
      ["missing"]
    );

    expect(result.success).toBe(false);
    expect(auditLogRepository.createAuditLog).not.toHaveBeenCalled();
  });

  it("returns an error when the repository fails", async () => {
    vi.mocked(auditLogRepository.deleteAuditLogsByIds).mockResolvedValue({
      data: null,
      error: { message: "db error" },
    } as never);

    const result = await deleteAuditLogsForManager(
      adminClient,
      "user-1",
      actor,
      ["log-1"]
    );

    expect(result).toEqual({
      success: false,
      error: "Unable to delete logs. Please try again.",
    });
  });
});
