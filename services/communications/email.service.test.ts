import { beforeEach, describe, expect, it, vi } from "vitest";
import * as authRepository from "@/repositories/auth.repository";
import * as emailSentRepository from "@/repositories/email-sent.repository";
import * as emailUsersRepository from "@/repositories/email-users.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as auditLogService from "@/services/ops/audit-log.service";
import type { AuditActor } from "@/services/ops/audit-log.service";
import {
  resendSentEmailForManager,
  sendEmailsForManager,
} from "@/services/communications/email.service";

const mailtrapSend = vi.fn();

vi.mock("@/lib/mailtrap/client", () => ({
  createMailtrapClient: () => ({ send: mailtrapSend }),
  getMailtrapSender: () => ({ email: "noreply@school.test", name: "School" }),
}));

vi.mock("@/repositories/auth.repository");
vi.mock("@/repositories/profile.repository");
vi.mock("@/repositories/email-sent.repository");
vi.mock("@/repositories/email-users.repository");
vi.mock("@/services/ops/audit-log.service", () => ({
  recordManagerAuditLog: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/services/auth/authorization.service", () => ({
  getUnauthorizedError: vi.fn(async (_c, userId) =>
    userId ? null : "Unauthorized."
  ),
}));

const adminClient = {} as never;
const actor: AuditActor = {
  userId: "11111111-1111-4111-8111-111111111111",
  userLabel: "Manager",
};

const userIds = [
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
];

function mockRecipients() {
  vi.mocked(profileRepository.listProfilesByIds).mockResolvedValue({
    data: [
      { id: userIds[0], full_name: "Student One", role: "student", is_instructor: false, created_at: "" },
      { id: userIds[1], full_name: "Student Two", role: "student", is_instructor: false, created_at: "" },
    ],
    error: null,
    count: null,
    status: 200,
    statusText: "OK",
  } as never);

  const emailMap = new Map([
    [userIds[0], "student1@school.test"],
    [userIds[1], "student2@school.test"],
  ]);

  vi.mocked(authRepository.listAuthEmailsByIds).mockResolvedValue({
    data: emailMap,
    error: null,
  });
}

describe("sendEmailsForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mailtrapSend.mockResolvedValue({ message_ids: ["msg-1"] });
    mockRecipients();

    vi.mocked(emailSentRepository.createEmailSentWithReference).mockResolvedValue({
      data: {
        id: "sent-1",
        reference_code: "REF-001",
        title: "Hello",
        body: "Body",
        locale: "ar",
        template_id: "custom",
        created_by: actor.userId,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    vi.mocked(emailUsersRepository.insertEmailUsers).mockResolvedValue({
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
      data: null,
    } as never);
  });

  it("persists pending rows before send, then final delivery rows", async () => {
    const result = await sendEmailsForManager(adminClient, actor.userId, actor, {
      templateId: "custom",
      userIds,
      subject: "Hello",
      body: "Message body",
    });

    expect(result.success).toBe(true);
    expect(mailtrapSend).toHaveBeenCalledTimes(2);
    expect(emailUsersRepository.insertEmailUsers).toHaveBeenCalledTimes(2);

    const pendingRows =
      vi.mocked(emailUsersRepository.insertEmailUsers).mock.calls[0][1];
    expect(pendingRows).toHaveLength(2);
    expect(pendingRows.every((row) => row.deliveryStatus === "pending")).toBe(
      true
    );

    const finalRows =
      vi.mocked(emailUsersRepository.insertEmailUsers).mock.calls[1][1];
    expect(finalRows).toHaveLength(2);
    expect(finalRows.every((row) => row.emailSentId === "sent-1")).toBe(true);
    expect(finalRows.every((row) => row.deliveryStatus === "sent")).toBe(true);
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalledWith(
      adminClient,
      actor,
      expect.objectContaining({
        action: "other",
        table_name: "email_sent",
        record_id: "sent-1",
        metadata: expect.objectContaining({
          recipient_count: 2,
          subject: "Hello",
        }),
      })
    );
  });

  it("still succeeds when final ledger persist fails after sends", async () => {
    vi.mocked(emailUsersRepository.insertEmailUsers)
      .mockResolvedValueOnce({
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
        data: null,
      } as never)
      .mockResolvedValueOnce({
        error: { message: "ledger write failed" },
        count: null,
        status: 500,
        statusText: "Error",
        data: null,
      } as never);

    const result = await sendEmailsForManager(adminClient, actor.userId, actor, {
      templateId: "custom",
      userIds,
      subject: "Hello",
      body: "Message body",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.message).toMatch(/ledger is incomplete/i);
    }
    expect(mailtrapSend).toHaveBeenCalledTimes(2);
  });
});

describe("resendSentEmailForManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mailtrapSend.mockResolvedValue({ message_ids: ["msg-2"] });
    mockRecipients();

    vi.mocked(emailSentRepository.findEmailSentById).mockResolvedValue({
      data: {
        id: "sent-1",
        reference_code: "REF-001",
        title: "Hello",
        body: "Body",
        locale: "ar",
        template_id: "custom",
        created_by: actor.userId,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    } as never);

    vi.mocked(emailUsersRepository.insertEmailUsers).mockResolvedValue({
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
      data: null,
    } as never);
  });

  it("persists pending rows before resend, then final delivery rows", async () => {
    vi.mocked(emailUsersRepository.listEmailUsersByEmailSentId).mockResolvedValue(
      {
        data: [],
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never
    );

    const result = await resendSentEmailForManager(
      adminClient,
      actor.userId,
      actor,
      {
        emailSentId: "sent-1",
        userIds,
        toEmails: [],
      }
    );

    expect(result.success).toBe(true);
    expect(mailtrapSend).toHaveBeenCalledTimes(2);
    expect(emailUsersRepository.insertEmailUsers).toHaveBeenCalledTimes(2);

    const pendingRows =
      vi.mocked(emailUsersRepository.insertEmailUsers).mock.calls[0][1];
    expect(pendingRows.every((row) => row.deliveryStatus === "pending")).toBe(
      true
    );

    const finalRows =
      vi.mocked(emailUsersRepository.insertEmailUsers).mock.calls[1][1];
    expect(finalRows).toHaveLength(2);
    expect(finalRows.every((row) => row.deliveryStatus === "sent")).toBe(true);
    expect(auditLogService.recordManagerAuditLog).toHaveBeenCalledWith(
      adminClient,
      actor,
      expect.objectContaining({
        action: "other",
        table_name: "email_sent",
        metadata: expect.objectContaining({
          recipient_count: 2,
          subject: "Hello",
          resent: true,
        }),
      })
    );
  });

  it("does not overwrite prior sent delivery rows with pending on resend", async () => {
    vi.mocked(emailUsersRepository.listEmailUsersByEmailSentId).mockResolvedValue(
      {
        data: [
          {
            id: "eu-1",
            email_sent_id: "sent-1",
            email_address: "student1@school.test",
            delivery_status: "sent",
          },
        ],
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never
    );

    const result = await resendSentEmailForManager(
      adminClient,
      actor.userId,
      actor,
      {
        emailSentId: "sent-1",
        userIds,
        toEmails: [],
      }
    );

    expect(result.success).toBe(true);
    const pendingRows =
      vi.mocked(emailUsersRepository.insertEmailUsers).mock.calls[0][1];
    expect(pendingRows).toHaveLength(1);
    expect(pendingRows[0]?.emailAddress).toBe("student2@school.test");
    expect(pendingRows[0]?.deliveryStatus).toBe("pending");
  });

  it("does not overwrite prior sent with failed when resend send fails", async () => {
    vi.mocked(emailUsersRepository.listEmailUsersByEmailSentId).mockResolvedValue(
      {
        data: [
          {
            id: "eu-1",
            email_sent_id: "sent-1",
            email_address: "student1@school.test",
            delivery_status: "sent",
          },
        ],
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      } as never
    );
    mailtrapSend
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ message_ids: ["msg-ok"] });

    const result = await resendSentEmailForManager(
      adminClient,
      actor.userId,
      actor,
      {
        emailSentId: "sent-1",
        userIds,
        toEmails: [],
      }
    );

    expect(result.success).toBe(true);
    const finalRows = vi
      .mocked(emailUsersRepository.insertEmailUsers)
      .mock.calls.map((call) => call[1])
      .flat()
      .filter((row) => row.deliveryStatus !== "pending");
    expect(
      finalRows.some(
        (row) =>
          row.emailAddress === "student1@school.test" &&
          row.deliveryStatus === "failed"
      )
    ).toBe(false);
    expect(
      finalRows.some(
        (row) =>
          row.emailAddress === "student2@school.test" &&
          row.deliveryStatus === "sent"
      )
    ).toBe(true);
  });
});
