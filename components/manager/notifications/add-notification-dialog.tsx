"use client";

import { useActionState, useEffect, useMemo, useTransition } from "react";
import { createNotificationAction } from "@/app/manager/notifications/actions";
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
import { getNotificationActionPagesForAudience } from "@/lib/constants/notification-action-pages";
import {
  NOTIFICATION_AUDIENCE_LABELS,
  NOTIFICATION_AUDIENCE_VALUES,
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_CATEGORY_VALUES,
  NOTIFICATION_PRIORITY_LABELS,
  NOTIFICATION_PRIORITY_VALUES,
} from "@/lib/constants/manager-notification-display";
import { cn } from "@/lib/utils";
import {
  createNotificationSchema,
  NOTIFICATION_ACTION_NONE_VALUE,
  type CreateNotificationInput,
} from "@/lib/validators/manager/create-notification";
import type {
  CreateNotificationActionState,
  ManagerNotificationRow,
} from "@/types/manager-notification";

const initialState: CreateNotificationActionState = {};

type AddNotificationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNotificationCreated: (notification: ManagerNotificationRow) => void;
};

export function AddNotificationDialog({
  open,
  onOpenChange,
  onNotificationCreated,
}: AddNotificationDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createNotificationAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: createNotificationSchema,
    mode: "onBlur",
    defaultValues: {
      title: "",
      body: "",
      audience: "manager",
      category: "general",
      priority: "normal",
      action_href: NOTIFICATION_ACTION_NONE_VALUE,
    },
  });

  const selectedAudience = watch("audience");
  const selectedCategory = watch("category");
  const selectedPriority = watch("priority");
  const selectedActionHref = watch("action_href");

  const actionPages = useMemo(
    () => getNotificationActionPagesForAudience(selectedAudience),
    [selectedAudience]
  );

  useEffect(() => {
    if (!open) {
      reset({
        title: "",
        body: "",
        audience: "manager",
        category: "general",
        priority: "normal",
        action_href: NOTIFICATION_ACTION_NONE_VALUE,
      });
    }
  }, [open, reset]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (
      !selectedActionHref ||
      selectedActionHref === NOTIFICATION_ACTION_NONE_VALUE
    ) {
      return;
    }

    const isValid = actionPages.some((page) => page.href === selectedActionHref);
    if (!isValid) {
      setValue("action_href", NOTIFICATION_ACTION_NONE_VALUE, {
        shouldValidate: true,
      });
    }
  }, [actionPages, open, selectedActionHref, setValue]);

  useActionStateSuccess(state, isPending, (nextState) => {
    onOpenChange(false);
    if (nextState.notification) {
      onNotificationCreated(nextState.notification);
    }
  });

  function onSubmit(values: CreateNotificationInput) {
    const formData = new FormData();
    formData.set("title", values.title.trim());
    formData.set("body", values.body.trim());
    formData.set("audience", values.audience);
    formData.set("category", values.category);
    formData.set("priority", values.priority);
    formData.set(
      "action_href",
      values.action_href && values.action_href !== NOTIFICATION_ACTION_NONE_VALUE
        ? values.action_href
        : NOTIFICATION_ACTION_NONE_VALUE
    );

    startTransition(() => {
      formAction(formData);
    });
  }

  const titleError = errors.title?.message ?? state.fieldErrors?.title?.[0];
  const bodyError = errors.body?.message ?? state.fieldErrors?.body?.[0];
  const audienceError =
    errors.audience?.message ?? state.fieldErrors?.audience?.[0];
  const categoryError =
    errors.category?.message ?? state.fieldErrors?.category?.[0];
  const priorityError =
    errors.priority?.message ?? state.fieldErrors?.priority?.[0];
  const actionHrefError =
    errors.action_href?.message ?? state.fieldErrors?.action_href?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Create notification</DialogTitle>
          <DialogDescription>
            Compose a notification for a role audience. It will be stored and
            available in the inbox.
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-notification-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-notification-title"
              label="Title"
              hint="Required"
            />
            <Input
              id="create-notification-title"
              aria-invalid={!!titleError}
              disabled={isPending}
              {...register("title")}
            />
            {titleError ? (
              <p className="text-sm text-destructive">{titleError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-notification-body"
              label="Message"
              hint="Required"
            />
            <textarea
              id="create-notification-body"
              rows={4}
              aria-invalid={!!bodyError}
              disabled={isPending}
              className={cn(
                "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
              )}
              {...register("body")}
            />
            {bodyError ? (
              <p className="text-sm text-destructive">{bodyError}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="create-notification-audience"
                label="Audience"
                hint="Who receives it"
              />
              <Select
                value={selectedAudience}
                disabled={isPending}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }

                  setValue("audience", value as CreateNotificationInput["audience"], {
                    shouldValidate: true,
                  });
                  setValue("action_href", NOTIFICATION_ACTION_NONE_VALUE, {
                    shouldValidate: true,
                  });
                }}
              >
                <SelectTrigger
                  id="create-notification-audience"
                  className="w-full"
                  aria-invalid={!!audienceError}
                >
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_AUDIENCE_VALUES.map((audience) => (
                    <SelectItem key={audience} value={audience}>
                      {NOTIFICATION_AUDIENCE_LABELS[audience]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {audienceError ? (
                <p className="text-sm text-destructive">{audienceError}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="create-notification-category"
                label="Category"
                hint="Notification type"
              />
              <Select
                value={selectedCategory}
                disabled={isPending}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }

                  setValue("category", value as CreateNotificationInput["category"], {
                    shouldValidate: true,
                  });
                }}
              >
                <SelectTrigger
                  id="create-notification-category"
                  className="w-full"
                  aria-invalid={!!categoryError}
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_CATEGORY_VALUES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {NOTIFICATION_CATEGORY_LABELS[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categoryError ? (
                <p className="text-sm text-destructive">{categoryError}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="create-notification-priority"
                label="Priority"
                hint="Urgency level"
              />
              <Select
                value={selectedPriority}
                disabled={isPending}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }

                  setValue("priority", value as CreateNotificationInput["priority"], {
                    shouldValidate: true,
                  });
                }}
              >
                <SelectTrigger
                  id="create-notification-priority"
                  className="w-full"
                  aria-invalid={!!priorityError}
                >
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_PRIORITY_VALUES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {NOTIFICATION_PRIORITY_LABELS[priority]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {priorityError ? (
                <p className="text-sm text-destructive">{priorityError}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="create-notification-action-href"
              label="Action link"
              hint={
                selectedAudience === "all"
                  ? "Optional page from any role panel"
                  : `Optional ${NOTIFICATION_AUDIENCE_LABELS[selectedAudience].toLowerCase()} panel page`
              }
            />
            <Select
              value={selectedActionHref ?? NOTIFICATION_ACTION_NONE_VALUE}
              disabled={isPending}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValue("action_href", value, { shouldValidate: true });
              }}
            >
              <SelectTrigger
                id="create-notification-action-href"
                className="w-full"
                aria-invalid={!!actionHrefError}
              >
                <SelectValue placeholder="Select a page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NOTIFICATION_ACTION_NONE_VALUE}>
                  No linked page
                </SelectItem>
                {actionPages.map((page) => (
                  <SelectItem key={page.href} value={page.href}>
                    {page.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {actionHrefError ? (
              <p className="text-sm text-destructive">{actionHrefError}</p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="create-notification-form" disabled={isPending}>
            {isPending ? (
              <>
                <InlineSpinner />
                Creating notification
              </>
            ) : (
              "Create notification"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
