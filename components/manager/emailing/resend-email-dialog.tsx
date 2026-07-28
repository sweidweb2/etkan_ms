"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcwIcon, SendIcon } from "lucide-react";
import { resendManagerEmailAction } from "@/app/manager/sent/actions";
import {
  RecipientToField,
  type ComposeRecipient,
} from "@/components/manager/emailing/recipient-to-field";
import { FieldLabel } from "@/components/auth/field-label";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  resendEmailSchema,
  type ResendEmailInput,
} from "@/lib/validators/manager/resend-email";
import type {
  ManagerEmailSentListRow,
  SendManagerEmailActionState,
} from "@/types/manager-emailing";
import type { ManagerUserRow } from "@/types/manager-user";

const initialState: SendManagerEmailActionState = {};

type ResendEmailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: ManagerEmailSentListRow | null;
  users: ManagerUserRow[];
};

export function ResendEmailDialog({
  open,
  onOpenChange,
  email,
  users,
}: ResendEmailDialogProps) {
  const router = useRouter();
  const [recipients, setRecipients] = useState<ComposeRecipient[]>([]);
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    resendManagerEmailAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);

  const {
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useZodForm({
    schema: resendEmailSchema,
    mode: "onSubmit",
    defaultValues: {
      emailSentId: email?.id ?? "",
      userIds: [],
      toEmails: [],
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    setRecipients([]);
    reset({
      emailSentId: email?.id ?? "",
      userIds: [],
      toEmails: [],
    });
  }, [open, email?.id, reset]);

  useActionStateSuccess(state, isPending, () => {
    onOpenChange(false);
    router.refresh();
  });

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
    if (email?.id) {
      setValue("emailSentId", email.id, { shouldValidate: false });
    }
  }

  function onSubmit(values: ResendEmailInput) {
    const formData = new FormData();
    formData.set("emailSentId", values.emailSentId);
    for (const id of values.userIds) {
      formData.append("userIds", id);
    }
    for (const address of values.toEmails) {
      formData.append("toEmails", address);
    }

    startTransition(() => {
      formAction(formData);
    });
  }

  const recipientError =
    errors.toEmails?.message ??
    errors.userIds?.message ??
    state.fieldErrors?.toEmails?.[0] ??
    state.fieldErrors?.userIds?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Resend circular</DialogTitle>
          <DialogDescription>
            {email
              ? `Resend Ref. ${email.reference_code} — ${email.title}`
              : "Choose recipients to resend this circular."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="resend-email-form"
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(event) => {
            syncRecipientsToForm();
            void handleSubmit(onSubmit)(event);
          }}
        >
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="resend-to" label="To" hint="Required" />
            <RecipientToField
              users={users}
              recipients={recipients}
              onChange={setRecipients}
              disabled={isPending}
              invalid={!!recipientError}
            />
            {recipientError ? (
              <p className="text-sm text-destructive">{recipientError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Search users by name or email, or use the bulk role shortcuts.
              </p>
            )}
          </div>
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
            form="resend-email-form"
            disabled={isPending || !email}
          >
            {isPending ? (
              <InlineSpinner />
            ) : (
              <SendIcon data-icon="inline-start" />
            )}
            Resend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ResendEmailButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <RotateCcwIcon data-icon="inline-start" />
      Resend
    </Button>
  );
}
