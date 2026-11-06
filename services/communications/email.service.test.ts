import { beforeEach, describe, expect, it, vi } from "vitest";
import * as authRepository from "@/repositories/auth.repository";
import * as emailSentRepository from "@/repositories/email-sent.repository";
import * as emailUsersRepository from "@/repositories/email-users.repository";
import * as profileRepository from "@/repositories/profile.repository";
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

  it("persists all delivery rows in one batch after sequential sends", async () => {
    const result = await sendEmailsForManager(adminClient, actor.userId, actor, {
      templateId: "custom",
      userIds,
      subject: "Hello",
      body: "Message body",
    });

    expect(result.success).toBe(true);
    expect(mailtrapSend).toHaveBeenCalledTimes(2);
    expect(emailUsersRepository.insertEmailUsers).toHaveBeenCalledTimes(1);

    const rows = vi.mocked(emailUsersRepository.insertEmailUsers).mock.calls[0][1];
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.emailSentId === "sent-1")).toBe(true);
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

  it("persists all resend delivery rows in one batch", async () => {
    const result = await resendSentEmailForManager(adminClient, actor.userId, {
      emailSentId: "sent-1",
      userIds,
      toEmails: [],
    });

    expect(result.success).toBe(true);
    expect(mailtrapSend).toHaveBeenCalledTimes(2);
    expect(emailUsersRepository.insertEmailUsers).toHaveBeenCalledTimes(1);

    const rows = vi.mocked(emailUsersRepository.insertEmailUsers).mock.calls[0][1];
    expect(rows).toHaveLength(2);
  });
});
