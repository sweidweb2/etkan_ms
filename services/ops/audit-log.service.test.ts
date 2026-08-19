import { beforeEach, describe, expect, it, vi } from "vitest";
import * as auditLogRepository from "@/repositories/audit-log.repository";
import {
  createAuditLogForManager,
  recordManagerAuditLog,
} from "@/services/audit-log.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

vi.mock("@/repositories/audit-log.repository", () => ({
  createAuditLog: vi.fn(),
  listAuditLogs: vi.fn(),
}));


vi.mock("@/services/authorization.service", () => ({
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
        table_name: "equipments",
        record_id: "eq-1",
        old_data: null,
        new_data: null,
        metadata: { note: "updated" },
        created_at: "2026-07-10T00:00:00.000Z",
      },
      error: null,
    } as never);

    await recordManagerAuditLog(adminClient, actor, {
      action: "update",
      table_name: "equipments",
      record_id: "eq-1",
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
});
