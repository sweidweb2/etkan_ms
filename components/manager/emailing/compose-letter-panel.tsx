"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { ArrowLeftIcon, SendIcon } from "lucide-react";
import {
  loadEmailingRecipientsAction,
  sendManagerEmailAction,
} from "@/app/manager/emailing/actions";
import { Can } from "@/components/auth/can";
import {
  RecipientToField,
  type ComposeRecipient,
} from "@/components/manager/emailing/recipient-to-field";
import { TiptapEmailEditor } from "@/components/manager/emailing/tiptap-email-editor";
import { FieldLabel } from "@/components/auth/field-label";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { PanelPageHeader } from "@/components/panels/panel-page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useZodForm } from "@/hooks/use-zod-form";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import type { EmailLocale } from "@/lib/email/templates";
import { cn } from "@/lib/utils";
import {
  EMAIL_COMPOSE_LIMITS,
  sendEmailSchema,
  type SendEmailInput,
} from "@/lib/validators/manager/send-email";
import type { SendManagerEmailActionState } from "@/types/manager-emailing";
const initialState: SendManagerEmailActionState = {};

function emptyComposeValues(): SendEmailInput {
  return {
    templateId: "custom",
    locale: "ar",
    userIds: [],
    toEmail: undefined,
    toEmails: [],
    bodyHtml: undefined,
    account_email: undefined,
    temporary_password: undefined,
    title: undefined,
    body: undefined,
    date: undefined,
    subject: undefined,
    item_name: undefined,
    due_at: undefined,
    consequence: undefined,
    cta_url: undefined,
    amount: undefined,
    due_date: undefined,
    semester_label: undefined,
    contact_note: undefined,
    semester_name: undefined,
    status: undefined,
    start_date: undefined,
    next_step: undefined,
  };
}

function fieldError(
  errors: Record<string, { message?: string } | undefined>,
  state: SendManagerEmailActionState,
  key: string
) {
  return errors[key]?.message ?? state.fieldErrors?.[key]?.[0];
}

export function ComposeLetterPanel() {
  const [recipients, setRecipients] = useState<ComposeRecipient[]>([]);
  const [editorKey, setEditorKey] = useState(0);

  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    sendManagerEmailAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useZodForm({
    schema: sendEmailSchema,
    mode: "onBlur",
    defaultValues: emptyComposeValues(),
  });

  const selectedLocale = (watch("locale") as EmailLocale | undefined) ?? "ar";
  const bodyHtml = watch("bodyHtml") ?? "<p></p>";
  const textDirection = selectedLocale === "ar" ? "rtl" : "ltr";

  function syncRecipientsToForm(next: ComposeRecipient[] = recipients) {
    const userIds = next
      .filter(
        (recipient): recipient is Extract<ComposeRecipient, { kind: "user" }> =>
          recipient.kind === "user"
      )
      .map((recipient) => recipient.user.id);

    const toEmails = next
      .filter(
        (
          recipient
        ): recipient is Extract<ComposeRecipient, { kind: "external" }> =>
          recipient.kind === "external"
      )
      .map((recipient) => recipient.email);

    setValue("userIds", userIds, { shouldValidate: false });
    setValue("toEmails", toEmails, { shouldValidate: false });
    setValue("toEmail", undefined, { shouldValidate: false });
  }

  useEffect(() => {
    syncRecipientsToForm(recipients);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync from recipient chips only
  }, [recipients, setValue]);

  useActionStateSuccess(state, isPending, () => {
    setRecipients([]);
    reset(emptyComposeValues());
    setEditorKey((key) => key + 1);
  });

  function onRecipientsChange(next: ComposeRecipient[]) {
    setRecipients(next);
  }

  function onSubmit(values: SendEmailInput) {
    const formData = new FormData();
    formData.set("templateId", "custom");
    formData.set("locale", values.locale ?? "ar");
    formData.set("subject", values.subject?.trim() ?? "");

    if (values.body?.trim()) {
      formData.set("body", values.body.trim());
    }
    if (values.bodyHtml?.trim()) {
      formData.set("bodyHtml", values.bodyHtml);
    }

    for (const id of values.userIds) {
      formData.append("userIds", id);
    }
    for (const email of values.toEmails ?? []) {
      formData.append("toEmails", email);
    }

    startTransition(() => {
      formAction(formData);
    });
  }

  function onFormSubmit(event: FormEvent<HTMLFormElement>) {
    syncRecipientsToForm();
    void handleSubmit(onSubmit)(event);
  }

  const recipientError =
    fieldError(errors, state, "toEmails") ??
    fieldError(errors, state, "toEmail") ??
    fieldError(errors, state, "userIds");

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader title="Compose letter" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={ROUTES.MANAGER_EMAILING}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ms-2 mb-1 inline-flex"
          )}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Back to emailing
        </Link>
        <Can permission={PERMISSIONS.EMAILING_SEND}>
          <Button
            type="submit"
            form="compose-letter-form"
            disabled={isPending}
          >
            {isPending ? <InlineSpinner /> : <SendIcon data-icon="inline-start" />}
            Send
          </Button>
        </Can>
      </div>

      <Card className="py-0">
        <CardHeader className="border-b py-3">
          <CardTitle>New message</CardTitle>
          <CardDescription>
            Pick recipients, write a subject, and compose the body with the
            editor.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <form
            id="compose-letter-form"
            onSubmit={onFormSubmit}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="compose-to" label="To" hint="Required" />
              <RecipientToField
                loadUsers={loadEmailingRecipientsAction}
                recipients={recipients}
                onChange={onRecipientsChange}
                disabled={isPending}
                invalid={!!recipientError}
              />
              {recipientError ? (
                <p className="text-sm text-destructive">{recipientError}</p>
              ) : null}
            </div>

            <div className="grid gap-4 @lg/panel:grid-cols-[1fr_11rem]">
              <div className="flex flex-col gap-2">
                <FieldLabel
                  htmlFor="compose-subject"
                  label="Subject"
                  hint="Required"
                />
                <Input
                  id="compose-subject"
                  type="text"
                  maxLength={EMAIL_COMPOSE_LIMITS.subject}
                  disabled={isPending}
                  placeholder="Subject"
                  dir={textDirection}
                  className={cn(
                    textDirection === "rtl" && "text-right"
                  )}
                  aria-invalid={!!fieldError(errors, state, "subject")}
                  {...register("subject")}
                />
                {fieldError(errors, state, "subject") ? (
                  <p className="text-sm text-destructive">
                    {fieldError(errors, state, "subject")}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel
                  htmlFor="compose-locale"
                  label="Language"
                  hint="Layout"
                />
                <Select
                  value={selectedLocale}
                  disabled={isPending}
                  onValueChange={(value) => {
                    if (!value) return;
                    setValue("locale", value as EmailLocale, {
                      shouldValidate: true,
                    });
                  }}
                >
                  <SelectTrigger id="compose-locale" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">العربية (RTL)</SelectItem>
                    <SelectItem value="en">English (LTR)</SelectItem>
                  </SelectContent>
                </Select>
                {fieldError(errors, state, "locale") ? (
                  <p className="text-sm text-destructive">
                    {fieldError(errors, state, "locale")}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="compose-body" label="Body" hint="Rich text" />
              <TiptapEmailEditor
                key={editorKey}
                value={bodyHtml || "<p></p>"}
                dir={textDirection}
                disabled={isPending}
                invalid={
                  !!(
                    fieldError(errors, state, "body") ||
                    fieldError(errors, state, "bodyHtml")
                  )
                }
                onChange={(html, plain) => {
                  setValue("bodyHtml", html, { shouldValidate: false });
                  setValue("body", plain, { shouldValidate: false });
                }}
                onBlur={() => {
                  void trigger(["body", "bodyHtml"]);
                }}
              />
              {fieldError(errors, state, "body") ||
              fieldError(errors, state, "bodyHtml") ? (
                <p className="text-sm text-destructive">
                  {fieldError(errors, state, "body") ??
                    fieldError(errors, state, "bodyHtml")}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <Link
                href={ROUTES.MANAGER_EMAILING}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  isPending && "pointer-events-none opacity-50"
                )}
              >
                Cancel
              </Link>
              <Can permission={PERMISSIONS.EMAILING_SEND}>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <InlineSpinner />
                  ) : (
                    <SendIcon data-icon="inline-start" />
                  )}
                  Send
                </Button>
              </Can>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
