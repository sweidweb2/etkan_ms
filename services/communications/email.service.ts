import { SITE, getSiteUrl } from "@/lib/config/site";
import { ROUTES } from "@/lib/constants/routes";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  EMAIL_CIRCULAR_CONTACT,
} from "@/lib/email/templates/chrome";
import {
  EMAIL_TEMPLATES,
  renderEmailTemplate,
  type EmailTemplateId,
} from "@/lib/email/templates";
import {
  createMailtrapClient,
  getMailtrapSender,
} from "@/lib/mailtrap/client";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import * as emailSentRepository from "@/repositories/email-sent.repository";
import * as emailUsersRepository from "@/repositories/email-users.repository";
import type {
  EmailDeliveryStatus,
  UpsertEmailUserInput,
} from "@/repositories/email-users.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import type { AuditActor } from "@/services/ops/audit-log.service";
import type { SendEmailInput as SendManagerEmailInput } from "@/lib/validators/manager/send-email";
import type { FieldErrors } from "@/types/auth";
import type {
  ManagerEmailSentDetail,
  ManagerEmailSentListRow,
  ManagerEmailUserRow,
} from "@/types/manager-emailing";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailResult =
  | { success: true; messageIds: string[] }
  | { success: false; error: string };

export type SendEmailsForManagerSuccess = {
  success: true;
  message: string;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  referenceCode?: string;
};

export type SendEmailsForManagerFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
  sentCount?: number;
  skippedCount?: number;
  failedCount?: number;
  referenceCode?: string;
};

export type SendEmailsForManagerResult =
  | SendEmailsForManagerSuccess
  | SendEmailsForManagerFailure;

type ResolvedRecipient = {
  studentId: string | null;
  email: string;
  displayName: string;
};

function normalizeRecipients(to: string | string[]) {
  const emails = (Array.isArray(to) ? to : [to])
    .map((email) => email.trim())
    .filter(Boolean);

  return emails.map((email) => ({ email }));
}

function getLoginUrl(): string {
  return `${getSiteUrl()}${ROUTES.LOGIN}`;
}

function getRecipientDisplayName(profile: {
  username: string | null;
}): string {
  return profile.username?.trim() || "there";
}

function buildCircularSnapshot(
  templateId: EmailTemplateId,
  input: SendManagerEmailInput
): { title: string; body: string } {
  switch (templateId) {
    case "welcome":
      return {
        title: "Welcome / Account ready",
        body: [
          `Account email: ${input.account_email}`,
          `Username: ${input.username}`,
          `Temporary password: ${input.temporary_password}`,
        ].join("\n"),
      };
    case "announcement":
      return {
        title: input.title!,
        body: [input.date ? `Date: ${input.date}` : null, input.body]
          .filter(Boolean)
          .join("\n\n"),
      };
    case "reminder":
      return {
        title: "Reminder",
        body: [
          `Item: ${input.item_name}`,
          `When: ${input.due_at}`,
          input.consequence ? input.consequence : null,
          input.cta_url ? `CTA: ${input.cta_url}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      };
    case "payment_reminder":
      return {
        title: "Payment reminder",
        body: [
          `Semester: ${input.semester_label}`,
          `Amount: ${input.amount}`,
          `Due: ${input.due_date}`,
          input.contact_note ? input.contact_note : null,
        ]
          .filter(Boolean)
          .join("\n"),
      };
    case "enrollment":
      return {
        title: "Enrollment update",
        body: [
          `Semester: ${input.semester_name}`,
          `Status: ${input.status}`,
          `Start date: ${input.start_date}`,
          `Next step: ${input.next_step}`,
        ].join("\n"),
      };
    case "custom":
      return {
        title: input.subject!,
        body: input.body?.trim()
          ? input.body
          : (input.bodyHtml ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      };
  }
}

/** Sends a transactional email via Mailtrap Email Sending API. */
export async function sendEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const recipients = normalizeRecipients(input.to);

  if (recipients.length === 0) {
    return { success: false, error: "At least one recipient email is required." };
  }

  if (!input.subject.trim()) {
    return { success: false, error: "Subject is required." };
  }

  if (!input.text.trim() && !input.html?.trim()) {
    return { success: false, error: "Email body is required." };
  }

  try {
    const client = createMailtrapClient();
    const from = getMailtrapSender();

    const response = await client.send({
      from,
      to: recipients,
      subject: input.subject.trim(),
      text: input.text,
      ...(input.html ? { html: input.html } : {}),
    });

    return {
      success: true,
      messageIds: response.message_ids ?? [],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send email.";
    return { success: false, error: message };
  }
}

/** One-off connectivity check: sends a short test message via Mailtrap. */
export async function sendMailtrapTestEmail(
  to = EMAIL_CIRCULAR_CONTACT
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: "Etkan MS — Mailtrap test",
    text: "This is a test email from Etkan MS via Mailtrap.",
    html: "<p>This is a test email from <strong>Etkan MS</strong> via Mailtrap.</p>",
  });
}

async function resolveRecipients(
  adminClient: Supabase,
  userIds: string[]
): Promise<{ recipients: ResolvedRecipient[]; skippedCount: number }> {
  const uniqueIds = [...new Set(userIds)];
  const [profilesResult, emailsResult] = await Promise.all([
    profileRepository.listProfilesByIds(adminClient, uniqueIds),
    authRepository.listAuthEmailsByIds(adminClient, uniqueIds),
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }
  if (emailsResult.error) {
    throw new Error(emailsResult.error.message);
  }

  const profileById = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile])
  );
  const recipients: ResolvedRecipient[] = [];
  let skippedCount = 0;

  for (const userId of uniqueIds) {
    const profile = profileById.get(userId);
    const email = emailsResult.data.get(userId)?.trim() ?? "";
    if (!profile || !email) {
      skippedCount += 1;
      continue;
    }

    recipients.push({
      studentId: userId,
      email,
      displayName: getRecipientDisplayName(profile),
    });
  }

  return { recipients, skippedCount };
}

async function persistEmailUserDeliveries(
  adminClient: Supabase,
  rows: UpsertEmailUserInput[]
) {
  const { error } = await emailUsersRepository.insertEmailUsers(
    adminClient,
    rows
  );
  if (error) {
    throw new Error(error.message);
  }
}

function buildTemplateVars(
  templateId: EmailTemplateId,
  input: SendManagerEmailInput,
  recipient: ResolvedRecipient,
  referenceCode: string
) {
  const shared = {
    recipient_name: recipient.displayName,
    school_name: SITE.name,
    support_email: EMAIL_CIRCULAR_CONTACT,
    login_url: getLoginUrl(),
    locale: input.locale ?? "ar",
    reference_code: referenceCode,
  };

  switch (templateId) {
    case "welcome":
      return {
        ...shared,
        account_email: input.account_email!,
        username: input.username!,
        temporary_password: input.temporary_password!,
      };
    case "announcement":
      return {
        ...shared,
        title: input.title!,
        body: input.body!,
        date: input.date,
      };
    case "reminder":
      return {
        ...shared,
        item_name: input.item_name!,
        due_at: input.due_at!,
        consequence: input.consequence,
        cta_url: input.cta_url,
      };
    case "payment_reminder":
      return {
        ...shared,
        amount: input.amount!,
        due_date: input.due_date!,
        semester_label: input.semester_label!,
        contact_note: input.contact_note,
      };
    case "enrollment":
      return {
        ...shared,
        semester_name: input.semester_name!,
        status: input.status!,
        start_date: input.start_date!,
        next_step: input.next_step!,
      };
    case "custom":
      return {
        ...shared,
        subject: input.subject!,
        body: input.body ?? "",
        bodyHtml: input.bodyHtml,
      };
  }
}

/** Manager-authorized multi-recipient send using the administrative circular layout. */
export async function sendEmailsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: SendManagerEmailInput
): Promise<SendEmailsForManagerResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.EMAILING_SEND);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  try {
    const externalEmails = [
      ...new Set(
        [
          ...(input.toEmail?.trim() ? [input.toEmail.trim().toLowerCase()] : []),
          ...(input.toEmails ?? []).map((email) => email.trim().toLowerCase()),
        ].filter(Boolean)
      ),
    ];

    let recipients: ResolvedRecipient[] = [];
    let skippedCount = 0;

    if (input.userIds.length > 0) {
      const resolved = await resolveRecipients(adminClient, input.userIds);
      recipients = resolved.recipients;
      skippedCount = resolved.skippedCount;
    }

    const knownEmails = new Set(
      recipients.map((recipient) => recipient.email.toLowerCase())
    );

    for (const email of externalEmails) {
      if (knownEmails.has(email)) {
        continue;
      }
      recipients.push({
        studentId: null,
        email,
        displayName: email.split("@")[0] || "there",
      });
      knownEmails.add(email);
    }

    if (recipients.length === 0) {
      return {
        success: false,
        error:
          skippedCount > 0
            ? "None of the selected users have a deliverable email address."
            : "Select at least one recipient.",
        skippedCount,
        sentCount: 0,
        failedCount: 0,
      };
    }

    const snapshot = buildCircularSnapshot(input.templateId, input);
    const locale = input.locale ?? "ar";

    const { data: emailSent, error: createError } =
      await emailSentRepository.createEmailSentWithReference(adminClient, {
        title: snapshot.title,
        body: snapshot.body,
        locale,
        templateId: input.templateId,
        createdBy: actor.userId,
      });

    if (createError || !emailSent) {
      return {
        success: false,
        error:
          createError?.message ??
          "Unable to allocate circular reference. Apply the email_sent migration and try again.",
      };
    }

    let sentCount = 0;
    let failedCount = 0;
    const deliveries: UpsertEmailUserInput[] = [];

    for (const recipient of recipients) {
      const vars = buildTemplateVars(
        input.templateId,
        input,
        recipient,
        emailSent.reference_code
      );
      const rendered = renderEmailTemplate(input.templateId, vars as never);
      const result = await sendEmail({
        to: recipient.email,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      });

      if (result.success) {
        sentCount += 1;
        deliveries.push({
          emailSentId: emailSent.id,
          studentId: recipient.studentId,
          emailAddress: recipient.email,
          deliveryStatus: "sent",
          sentAt: new Date().toISOString(),
          mailtrapMessageId: result.messageIds[0] ?? null,
        });
      } else {
        failedCount += 1;
        deliveries.push({
          emailSentId: emailSent.id,
          studentId: recipient.studentId,
          emailAddress: recipient.email,
          deliveryStatus: "failed",
          sentAt: null,
          mailtrapMessageId: null,
        });
      }
    }

    await persistEmailUserDeliveries(adminClient, deliveries);

    if (sentCount === 0) {
      return {
        success: false,
        error: "Unable to send email. Please try again.",
        sentCount,
        skippedCount,
        failedCount,
        referenceCode: emailSent.reference_code,
      };
    }

    const parts = [
      `Sent ${sentCount} email${sentCount === 1 ? "" : "s"} (Ref.: ${emailSent.reference_code}).`,
    ];
    if (skippedCount > 0) {
      parts.push(`Skipped ${skippedCount} without email.`);
    }
    if (failedCount > 0) {
      parts.push(`Failed ${failedCount}.`);
    }

    return {
      success: true,
      message: parts.join(" "),
      sentCount,
      skippedCount,
      failedCount,
      referenceCode: emailSent.reference_code,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to send email.";
    return { success: false, error: message };
  }
}

export type EmailingClassOption = {
  id: string;
  name: string;
};

export type EmailingTableFilterData = {
  classes: EmailingClassOption[];
};

export async function listEmailingTableFilterDataForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<EmailingTableFilterData> {
  const timer = createNavStepTimer("listEmailingTableFilterData");
  try {
    await timer.step("auth", () =>
      assertPermission(adminClient, actorUserId, PERMISSIONS.EMAILING_VIEW)
    );

    const classesResult = await timer.step("classes", () =>
      classRepository.listClasses(adminClient)
    );

    if (classesResult.error) {
      throw new Error(classesResult.error.message);
    }

    return {
      classes: (classesResult.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
      })),
    };
  } finally {
    timer.end();
  }
}

export async function listEmailingClassMemberUserIdsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<string[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.EMAILING_VIEW);

  const [studentsResult, teachersResult] = await Promise.all([
    studentClassRepository.listStudentUserIdsByClassId(adminClient, classId),
    classTeacherRepository.listClassTeachersByClassId(adminClient, classId),
  ]);

  if (studentsResult.error) {
    throw new Error(studentsResult.error.message);
  }
  if (teachersResult.error) {
    throw new Error(teachersResult.error.message);
  }

  const userIds = new Set<string>();
  for (const row of studentsResult.data ?? []) {
    if (row.user_id) {
      userIds.add(row.user_id);
    }
  }
  for (const row of teachersResult.data ?? []) {
    if (row.teacher_id) {
      userIds.add(row.teacher_id);
    }
  }

  return [...userIds];
}

function getTemplateLabel(templateId: string): string {
  return (
    EMAIL_TEMPLATES.find((template) => template.id === templateId)?.label ??
    templateId
  );
}

function isEmailLocale(value: string): value is "en" | "ar" {
  return value === "en" || value === "ar";
}

function isDeliveryStatus(value: string): value is EmailDeliveryStatus {
  return (
    value === "pending" ||
    value === "sent" ||
    value === "failed" ||
    value === "skipped"
  );
}

export const SENT_EMAILS_PAGE_SIZE = 50;

export type ListSentEmailsForManagerOptions = {
  page?: number;
  pageSize?: number;
};

export type ManagerSentEmailsPage = {
  emails: ManagerEmailSentListRow[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export async function listSentEmailsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  options: ListSentEmailsForManagerOptions = {}
): Promise<ManagerSentEmailsPage> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.EMAILING_VIEW);

  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(
    SENT_EMAILS_PAGE_SIZE,
    Math.max(1, options.pageSize ?? SENT_EMAILS_PAGE_SIZE)
  );
  const offset = (page - 1) * pageSize;

  const sentResult = await emailSentRepository.listEmailSentPage(adminClient, {
    offset,
    limit: pageSize,
  });
  if (sentResult.error) {
    throw new Error(sentResult.error.message);
  }

  const rows = sentResult.data ?? [];
  const ids = rows.map((row) => row.id);
  const countsResult =
    await emailUsersRepository.listEmailUserCountsByEmailSentIds(
      adminClient,
      ids
    );

  if (countsResult.error) {
    throw new Error(countsResult.error.message);
  }

  const statsBySentId = new Map<
    string,
    { recipient_count: number; sent_count: number; failed_count: number }
  >();

  for (const row of countsResult.data ?? []) {
    const current = statsBySentId.get(row.email_sent_id) ?? {
      recipient_count: 0,
      sent_count: 0,
      failed_count: 0,
    };
    current.recipient_count += 1;
    if (row.delivery_status === "sent") {
      current.sent_count += 1;
    }
    if (row.delivery_status === "failed") {
      current.failed_count += 1;
    }
    statsBySentId.set(row.email_sent_id, current);
  }

  return {
    emails: rows.map((row) => {
      const stats = statsBySentId.get(row.id) ?? {
        recipient_count: 0,
        sent_count: 0,
        failed_count: 0,
      };

      return {
        id: row.id,
        reference_code: row.reference_code,
        title: row.title,
        locale: isEmailLocale(row.locale) ? row.locale : "en",
        template_id: row.template_id,
        template_label: getTemplateLabel(row.template_id),
        created_at: row.created_at,
        recipient_count: stats.recipient_count,
        sent_count: stats.sent_count,
        failed_count: stats.failed_count,
      };
    }),
    totalCount: sentResult.count ?? rows.length,
    page,
    pageSize,
  };
}

export async function getSentEmailDetailForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  emailSentId: string
): Promise<{
  email: ManagerEmailSentDetail;
  recipients: ManagerEmailUserRow[];
} | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.EMAILING_VIEW);

  const [sentResult, usersResult] = await Promise.all([
    emailSentRepository.findEmailSentById(adminClient, emailSentId),
    emailUsersRepository.listEmailUsersByEmailSentId(adminClient, emailSentId),
  ]);

  if (sentResult.error) {
    throw new Error(sentResult.error.message);
  }
  if (usersResult.error) {
    throw new Error(usersResult.error.message);
  }

  if (!sentResult.data) {
    return null;
  }

  const row = sentResult.data;

  return {
    email: {
      id: row.id,
      reference_code: row.reference_code,
      reference_number: row.reference_number,
      year: row.year,
      title: row.title,
      body: row.body,
      locale: isEmailLocale(row.locale) ? row.locale : "en",
      template_id: row.template_id,
      template_label: getTemplateLabel(row.template_id),
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    recipients: (usersResult.data ?? []).map((recipient) => ({
      id: recipient.id,
      email_sent_id: recipient.email_sent_id,
      student_id: recipient.student_id,
      email_address: recipient.email_address,
      sent_at: recipient.sent_at,
      delivery_status: isDeliveryStatus(recipient.delivery_status)
        ? recipient.delivery_status
        : "pending",
      opened_at: recipient.opened_at,
      mailtrap_message_id: recipient.mailtrap_message_id,
      created_at: recipient.created_at,
    })),
  };
}

export async function resendSentEmailForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  input: {
    emailSentId: string;
    userIds: string[];
    toEmails: string[];
  }
): Promise<SendEmailsForManagerResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.EMAILING_RESEND);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  try {
    const sentResult = await emailSentRepository.findEmailSentById(
      adminClient,
      input.emailSentId
    );

    if (sentResult.error) {
      return { success: false, error: sentResult.error.message };
    }

    if (!sentResult.data) {
      return { success: false, error: "Sent email not found." };
    }

    const emailSent = sentResult.data;
    const locale = isEmailLocale(emailSent.locale) ? emailSent.locale : "ar";

    let recipients: ResolvedRecipient[] = [];
    let skippedCount = 0;

    if (input.userIds.length > 0) {
      const resolved = await resolveRecipients(adminClient, input.userIds);
      recipients = resolved.recipients;
      skippedCount = resolved.skippedCount;
    }

    const knownEmails = new Set(
      recipients.map((recipient) => recipient.email.toLowerCase())
    );

    for (const email of input.toEmails.map((value) => value.trim().toLowerCase())) {
      if (!email || knownEmails.has(email)) {
        continue;
      }
      recipients.push({
        studentId: null,
        email,
        displayName: email.split("@")[0] || "there",
      });
      knownEmails.add(email);
    }

    if (recipients.length === 0) {
      return {
        success: false,
        error:
          skippedCount > 0
            ? "None of the selected users have a deliverable email address."
            : "Select at least one recipient.",
        skippedCount,
        sentCount: 0,
        failedCount: 0,
      };
    }

    let sentCount = 0;
    let failedCount = 0;
    const deliveries: UpsertEmailUserInput[] = [];

    for (const recipient of recipients) {
      const rendered = renderEmailTemplate("custom", {
        recipient_name: recipient.displayName,
        school_name: SITE.name,
        support_email: EMAIL_CIRCULAR_CONTACT,
        login_url: getLoginUrl(),
        locale,
        reference_code: emailSent.reference_code,
        subject: emailSent.title,
        body: emailSent.body,
      });

      const result = await sendEmail({
        to: recipient.email,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      });

      if (result.success) {
        sentCount += 1;
        deliveries.push({
          emailSentId: emailSent.id,
          studentId: recipient.studentId,
          emailAddress: recipient.email,
          deliveryStatus: "sent",
          sentAt: new Date().toISOString(),
          mailtrapMessageId: result.messageIds[0] ?? null,
        });
      } else {
        failedCount += 1;
        deliveries.push({
          emailSentId: emailSent.id,
          studentId: recipient.studentId,
          emailAddress: recipient.email,
          deliveryStatus: "failed",
          sentAt: null,
          mailtrapMessageId: null,
        });
      }
    }

    await persistEmailUserDeliveries(adminClient, deliveries);

    if (sentCount === 0) {
      return {
        success: false,
        error: "Unable to resend email. Please try again.",
        sentCount,
        skippedCount,
        failedCount,
        referenceCode: emailSent.reference_code,
      };
    }

    const parts = [
      `Resent ${sentCount} email${sentCount === 1 ? "" : "s"} (Ref.: ${emailSent.reference_code}).`,
    ];
    if (skippedCount > 0) {
      parts.push(`Skipped ${skippedCount} without email.`);
    }
    if (failedCount > 0) {
      parts.push(`Failed ${failedCount}.`);
    }

    return {
      success: true,
      message: parts.join(" "),
      sentCount,
      skippedCount,
      failedCount,
      referenceCode: emailSent.reference_code,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to resend email.";
    return { success: false, error: message };
  }
}
