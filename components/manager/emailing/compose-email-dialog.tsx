"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { SendIcon } from "lucide-react";
import { sendManagerEmailAction } from "@/app/manager/emailing/actions";
import { FieldLabel } from "@/components/auth/field-label";
import { PasswordInput } from "@/components/auth/password-input";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import {
  EMAIL_TEMPLATES,
  type EmailLocale,
  type EmailTemplateId,
} from "@/lib/email/templates";
import { cn } from "@/lib/utils";
import {
  EMAIL_COMPOSE_LIMITS,
  sendEmailSchema,
  type SendEmailInput,
} from "@/lib/validators/manager/send-email";
import type { SendManagerEmailActionState } from "@/types/manager-emailing";
import type { ManagerUserRow } from "@/types/manager-user";
import type { ComponentProps } from "react";

const initialState: SendManagerEmailActionState = {};

const TEXTAREA_CLASS =
  "min-h-28 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80";

export type ComposeEmailTarget =
  | { mode: "single"; user: ManagerUserRow }
  | { mode: "bulk"; users: ManagerUserRow[] }
  | { mode: "external"; email: string };

type ComposeEmailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ComposeEmailTarget | null;
  initialTemplateId: EmailTemplateId;
};

function getUserDisplayName(user: ManagerUserRow) {
  return user.full_name || "—";
}

function emptyFormValues(
  templateId: EmailTemplateId,
  userIds: string[],
  toEmail?: string
): SendEmailInput {
  return {
    templateId,
    locale: "ar",
    userIds,
    toEmail,
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

export function ComposeEmailDialog({
  open,
  onOpenChange,
  target,
  initialTemplateId,
}: ComposeEmailDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    sendManagerEmailAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);

  const isExternal = target?.mode === "external";
  const recipients =
    !target
      ? []
      : target.mode === "single"
        ? [target.user]
        : target.mode === "bulk"
          ? target.users
          : [];
  const userIds = isExternal ? [] : recipients.map((user) => user.id);
  const toEmail = isExternal ? target.email : undefined;

  const isBulk = target?.mode === "bulk";
  const recipientLabel = !target
    ? ""
    : target.mode === "single"
      ? `${getUserDisplayName(target.user)} (${target.user.email || "no email"})`
      : target.mode === "bulk"
        ? `${target.users.length} selected users`
        : target.email;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: sendEmailSchema,
    mode: "onBlur",
    defaultValues: emptyFormValues(initialTemplateId, userIds, toEmail),
  });

  const selectedTemplateId = watch("templateId") as EmailTemplateId;
  const selectedLocale = (watch("locale") as EmailLocale | undefined) ?? "en";
  const userIdsKey = userIds.join(",");
  const toEmailKey = toEmail ?? "";

  useEffect(() => {
    if (!open) {
      return;
    }

    const defaults = emptyFormValues(initialTemplateId, userIds, toEmail);

    if (initialTemplateId === "welcome" && target?.mode === "single") {
      defaults.account_email = target.user.email || undefined;
    }

    if (initialTemplateId === "welcome" && target?.mode === "external") {
      defaults.account_email = target.email;
    }

    reset(defaults);
    // userIds/toEmail are new references each render; keys track contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stabilize recipient identity
  }, [open, initialTemplateId, reset, target, userIdsKey, toEmailKey]);

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
  });

  function onSubmit(values: SendEmailInput) {
    const formData = new FormData();
    formData.set("templateId", values.templateId);
    formData.set("locale", values.locale ?? "en");

    if (values.toEmail?.trim()) {
      formData.set("toEmail", values.toEmail.trim());
    }

    for (const id of values.userIds) {
      formData.append("userIds", id);
    }

    const optionalKeys = [
      "account_email",
      "temporary_password",
      "title",
      "body",
      "date",
      "subject",
      "item_name",
      "due_at",
      "consequence",
      "cta_url",
      "amount",
      "due_date",
      "semester_label",
      "contact_note",
      "semester_name",
      "status",
      "start_date",
      "next_step",
    ] as const;

    for (const key of optionalKeys) {
      const value = values[key];
      if (typeof value === "string" && value.trim()) {
        formData.set(key, value.trim());
      }
    }

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>
            {isExternal
              ? "Send custom email"
              : isBulk
                ? "Send email to selected"
                : "Send email"}
          </DialogTitle>
          <DialogDescription>
            Compose a message for {recipientLabel}. The selected template wraps
            your content in the Etkan email layout.
          </DialogDescription>
        </DialogHeader>

        <form
          id="send-manager-email-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto py-1"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="email-template" label="Template" hint="Required" />
              <Select
                value={selectedTemplateId}
                disabled={isPending}
                onValueChange={(value) => {
                  if (!value) return;
                  setValue("templateId", value as EmailTemplateId, {
                    shouldValidate: true,
                  });
                }}
              >
                <SelectTrigger id="email-template" className="w-full">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError(errors, state, "templateId") ? (
                <p className="text-sm text-destructive">
                  {fieldError(errors, state, "templateId")}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="email-locale" label="Language" hint="Layout direction" />
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
                <SelectTrigger id="email-locale" className="w-full">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (LTR)</SelectItem>
                  <SelectItem value="ar">العربية (RTL)</SelectItem>
                </SelectContent>
              </Select>
              {fieldError(errors, state, "locale") ? (
                <p className="text-sm text-destructive">
                  {fieldError(errors, state, "locale")}
                </p>
              ) : null}
            </div>
          </div>

          {fieldError(errors, state, "userIds") ||
          fieldError(errors, state, "toEmail") ? (
            <p className="text-sm text-destructive">
              {fieldError(errors, state, "userIds") ??
                fieldError(errors, state, "toEmail")}
            </p>
          ) : null}

          {selectedTemplateId === "welcome" ? (
            <>
              <TextField
                id="account_email"
                label="Account email"
                type="email"
                autoComplete="email"
                maxLength={AUTH_LIMITS.email.max}
                disabled={isPending}
                error={fieldError(errors, state, "account_email")}
                register={register("account_email")}
              />
              <PasswordField
                id="temporary_password"
                label="Temporary password"
                minLength={AUTH_LIMITS.password.min}
                maxLength={AUTH_LIMITS.password.max}
                disabled={isPending}
                error={fieldError(errors, state, "temporary_password")}
                register={register("temporary_password")}
              />
            </>
          ) : null}

          {selectedTemplateId === "announcement" ? (
            <>
              <TextField
                id="title"
                label="Title"
                type="text"
                maxLength={EMAIL_COMPOSE_LIMITS.title}
                disabled={isPending}
                error={fieldError(errors, state, "title")}
                register={register("title")}
              />
              <TextAreaField
                id="body"
                label="Message"
                maxLength={EMAIL_COMPOSE_LIMITS.body}
                disabled={isPending}
                error={fieldError(errors, state, "body")}
                register={register("body")}
              />
              <TextField
                id="date"
                label="Date"
                hint="Optional"
                type="date"
                disabled={isPending}
                error={fieldError(errors, state, "date")}
                register={register("date")}
              />
            </>
          ) : null}

          {selectedTemplateId === "reminder" ? (
            <>
              <TextField
                id="item_name"
                label="Item name"
                type="text"
                maxLength={EMAIL_COMPOSE_LIMITS.shortText}
                disabled={isPending}
                error={fieldError(errors, state, "item_name")}
                register={register("item_name")}
              />
              <div className="flex flex-col gap-2">
                <FieldLabel
                  htmlFor="due_at"
                  label="Date / time"
                  hint="Required"
                />
                <DateTimePicker
                  id="due_at"
                  value={(watch("due_at") as string | undefined) ?? ""}
                  onChange={(next) =>
                    setValue("due_at", next, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  aria-invalid={!!fieldError(errors, state, "due_at")}
                  disabled={isPending}
                />
                {fieldError(errors, state, "due_at") ? (
                  <p className="text-sm text-destructive">
                    {fieldError(errors, state, "due_at")}
                  </p>
                ) : null}
              </div>
              <TextAreaField
                id="consequence"
                label="Note"
                hint="Optional"
                maxLength={EMAIL_COMPOSE_LIMITS.body}
                disabled={isPending}
                error={fieldError(errors, state, "consequence")}
                register={register("consequence")}
              />
              <TextField
                id="cta_url"
                label="CTA URL"
                hint="Optional"
                type="url"
                inputMode="url"
                placeholder="https://"
                maxLength={EMAIL_COMPOSE_LIMITS.url}
                disabled={isPending}
                error={fieldError(errors, state, "cta_url")}
                register={register("cta_url")}
              />
            </>
          ) : null}

          {selectedTemplateId === "payment_reminder" ? (
            <>
              <TextField
                id="amount"
                label="Amount"
                type="text"
                inputMode="decimal"
                maxLength={EMAIL_COMPOSE_LIMITS.amount}
                placeholder="e.g. 150 USD"
                disabled={isPending}
                error={fieldError(errors, state, "amount")}
                register={register("amount")}
              />
              <TextField
                id="due_date"
                label="Due date"
                type="date"
                disabled={isPending}
                error={fieldError(errors, state, "due_date")}
                register={register("due_date")}
              />
              <TextField
                id="semester_label"
                label="Semester / label"
                type="text"
                maxLength={EMAIL_COMPOSE_LIMITS.shortText}
                disabled={isPending}
                error={fieldError(errors, state, "semester_label")}
                register={register("semester_label")}
              />
              <TextAreaField
                id="contact_note"
                label="Contact note"
                hint="Optional"
                maxLength={EMAIL_COMPOSE_LIMITS.body}
                disabled={isPending}
                error={fieldError(errors, state, "contact_note")}
                register={register("contact_note")}
              />
            </>
          ) : null}

          {selectedTemplateId === "enrollment" ? (
            <>
              <TextField
                id="semester_name"
                label="Semester name"
                type="text"
                maxLength={EMAIL_COMPOSE_LIMITS.shortText}
                disabled={isPending}
                error={fieldError(errors, state, "semester_name")}
                register={register("semester_name")}
              />
              <TextField
                id="status"
                label="Status"
                type="text"
                maxLength={EMAIL_COMPOSE_LIMITS.shortText}
                placeholder="Enrolled"
                disabled={isPending}
                error={fieldError(errors, state, "status")}
                register={register("status")}
              />
              <TextField
                id="start_date"
                label="Start date"
                type="date"
                disabled={isPending}
                error={fieldError(errors, state, "start_date")}
                register={register("start_date")}
              />
              <TextAreaField
                id="next_step"
                label="Next step"
                maxLength={EMAIL_COMPOSE_LIMITS.nextStep}
                disabled={isPending}
                error={fieldError(errors, state, "next_step")}
                register={register("next_step")}
              />
            </>
          ) : null}

          {selectedTemplateId === "custom" ? (
            <>
              <TextField
                id="subject"
                label="Subject"
                type="text"
                maxLength={EMAIL_COMPOSE_LIMITS.subject}
                disabled={isPending}
                error={fieldError(errors, state, "subject")}
                register={register("subject")}
              />
              <TextAreaField
                id="body"
                label="Message"
                maxLength={EMAIL_COMPOSE_LIMITS.bodyCustom}
                disabled={isPending}
                error={fieldError(errors, state, "body")}
                register={register("body")}
              />
            </>
          ) : null}
        </form>

        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="send-manager-email-form"
            disabled={
              isPending ||
              (isExternal ? !toEmail : recipients.length === 0)
            }
          >
            {isPending ? <InlineSpinner /> : <SendIcon data-icon="inline-start" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type RegisterReturn = ReturnType<ReturnType<typeof useZodForm>["register"]>;

function TextField({
  id,
  label,
  hint = "Required",
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
  minLength,
  maxLength,
  disabled,
  error,
  register,
}: {
  id: string;
  label: string;
  hint?: string;
  type?: ComponentProps<typeof Input>["type"];
  placeholder?: string;
  autoComplete?: string;
  inputMode?: ComponentProps<typeof Input>["inputMode"];
  minLength?: number;
  maxLength?: number;
  disabled: boolean;
  error?: string;
  register: RegisterReturn;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={id} label={label} hint={hint} />
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        minLength={minLength}
        maxLength={maxLength}
        aria-invalid={!!error}
        disabled={disabled}
        {...register}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function PasswordField({
  id,
  label,
  hint = "Required",
  minLength,
  maxLength,
  disabled,
  error,
  register,
}: {
  id: string;
  label: string;
  hint?: string;
  minLength?: number;
  maxLength?: number;
  disabled: boolean;
  error?: string;
  register: RegisterReturn;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={id} label={label} hint={hint} />
      <PasswordInput
        id={id}
        autoComplete="new-password"
        minLength={minLength}
        maxLength={maxLength}
        aria-invalid={!!error}
        disabled={disabled}
        {...register}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function TextAreaField({
  id,
  label,
  hint = "Required",
  maxLength,
  disabled,
  error,
  register,
}: {
  id: string;
  label: string;
  hint?: string;
  maxLength?: number;
  disabled: boolean;
  error?: string;
  register: RegisterReturn;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={id} label={label} hint={hint} />
      <textarea
        id={id}
        maxLength={maxLength}
        aria-invalid={!!error}
        disabled={disabled}
        className={cn(TEXTAREA_CLASS)}
        {...register}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
