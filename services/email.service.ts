import { SITE, getSiteUrl } from "@/lib/config/site";
import { ROUTES } from "@/lib/constants/routes";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import {
  EMAIL_CIRCULAR_CONTACT,
} from "@/lib/email/templates/chrome";
import {
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
import * as profileRepository from "@/repositories/profile.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import type { AuditActor } from "@/services/audit-log.service";
import type { SendEmailInput as SendManagerEmailInput } from "@/lib/validators/manager/send-email";
import type { FieldErrors } from "@/types/auth";
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
  const { data: profiles, error } = await profileRepository.listProfilesByIds(
    adminClient,
    uniqueIds
  );

  if (error) {
    throw new Error(error.message);
  }

  const profileById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile])
  );
  const recipients: ResolvedRecipient[] = [];
  let skippedCount = 0;

  for (const userId of uniqueIds) {
    const profile = profileById.get(userId);
    if (!profile) {
      skippedCount += 1;
      continue;
    }

    const { data: authData, error: authError } =
      await authRepository.getAuthUserById(adminClient, userId);

    const email = authData.user?.email?.trim() ?? "";
    if (authError || !email) {
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
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: SendManagerEmailInput
): Promise<SendEmailsForManagerResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
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
        await emailUsersRepository.upsertEmailUser(adminClient, {
          emailSentId: emailSent.id,
          studentId: recipient.studentId,
          emailAddress: recipient.email,
          deliveryStatus: "sent",
          sentAt: new Date().toISOString(),
          mailtrapMessageId: result.messageIds[0] ?? null,
        });
      } else {
        failedCount += 1;
        await emailUsersRepository.upsertEmailUser(adminClient, {
          emailSentId: emailSent.id,
          studentId: recipient.studentId,
          emailAddress: recipient.email,
          deliveryStatus: "failed",
          sentAt: null,
          mailtrapMessageId: null,
        });
      }
    }

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
  /** Profile user ids → class ids (student enrollments + teacher assignments). */
  userClassIds: Record<string, string[]>;
};

export async function listEmailingTableFilterDataForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null
): Promise<EmailingTableFilterData> {
  if (actorRole !== ROLES.MANAGER) {
    throw new Error("Unauthorized.");
  }

  const [classesResult, enrollmentsResult, teachersResult] = await Promise.all([
    classRepository.listClasses(adminClient),
    studentClassRepository.listStudentClassEnrollments(adminClient),
    classTeacherRepository.listClassTeacherAssignments(adminClient),
  ]);

  if (classesResult.error) {
    throw new Error(classesResult.error.message);
  }
  if (enrollmentsResult.error) {
    throw new Error(enrollmentsResult.error.message);
  }
  if (teachersResult.error) {
    throw new Error(teachersResult.error.message);
  }

  const classIdsByUser = new Map<string, Set<string>>();

  const addMembership = (userId: string | null | undefined, classId: string | null | undefined) => {
    if (!userId || !classId) {
      return;
    }
    const current = classIdsByUser.get(userId) ?? new Set<string>();
    current.add(classId);
    classIdsByUser.set(userId, current);
  };

  for (const row of enrollmentsResult.data ?? []) {
    addMembership(row.user_id, row.class_id);
  }

  for (const row of teachersResult.data ?? []) {
    addMembership(row.teacher_id, row.class_id);
  }

  const userClassIds: Record<string, string[]> = {};
  for (const [userId, classIds] of classIdsByUser) {
    userClassIds[userId] = [...classIds];
  }

  return {
    classes: (classesResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
    })),
    userClassIds,
  };
}
