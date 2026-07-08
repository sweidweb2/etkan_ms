"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldLabel } from "@/components/auth/field-label";
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
import { getNotificationActionPagesForAudience } from "@/lib/constants/notification-action-pages";
import {
  NOTIFICATION_AUDIENCE_LABELS,
  NOTIFICATION_AUDIENCE_VALUES,
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_CATEGORY_VALUES,
  NOTIFICATION_PRIORITY_LABELS,
  NOTIFICATION_PRIORITY_VALUES,
} from "@/lib/constants/manager-notification-display";
import { showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  createNotificationSchema,
  NOTIFICATION_ACTION_NONE_VALUE,
  type CreateNotificationInput,
} from "@/lib/validators/manager/create-notification";
import type { ManagerNotificationRow } from "@/types/manager-notification";

type AddNotificationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateNotification: (notification: ManagerNotificationRow) => void;
};

export function AddNotificationDialog({
  open,
  onOpenChange,
  onCreateNotification,
}: AddNotificationDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateNotificationInput>({
    resolver: zodResolver(createNotificationSchema),
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

  function onSubmit(values: CreateNotificationInput) {
    const actionHref =
      values.action_href &&
      values.action_href !== NOTIFICATION_ACTION_NONE_VALUE
        ? values.action_href
        : null;

    onCreateNotification({
      id: crypto.randomUUID(),
      recipient_id: null,
      audience: values.audience,
      category: values.category,
      priority: values.priority,
      title: values.title.trim(),
      body: values.body.trim(),
      action_href: actionHref,
      is_read: false,
      read_at: null,
      created_by: null,
      created_at: new Date().toISOString(),
    });

    showSuccessToast("Notification added to the preview list.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create notification</DialogTitle>
          <DialogDescription>
            Compose a preview notification for a role audience. Backend delivery
            is not connected yet.
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
              aria-invalid={!!errors.title}
              {...register("title")}
            />
            {errors.title ? (
              <p className="text-sm text-destructive">{errors.title.message}</p>
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
              aria-invalid={!!errors.body}
              className={cn(
                "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
              )}
              {...register("body")}
            />
            {errors.body ? (
              <p className="text-sm text-destructive">{errors.body.message}</p>
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
                  aria-invalid={!!errors.audience}
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
              {errors.audience ? (
                <p className="text-sm text-destructive">
                  {errors.audience.message}
                </p>
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
                  aria-invalid={!!errors.category}
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
              {errors.category ? (
                <p className="text-sm text-destructive">
                  {errors.category.message}
                </p>
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
                  aria-invalid={!!errors.priority}
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
              {errors.priority ? (
                <p className="text-sm text-destructive">
                  {errors.priority.message}
                </p>
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
                aria-invalid={!!errors.action_href}
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
            {errors.action_href ? (
              <p className="text-sm text-destructive">
                {errors.action_href.message}
              </p>
            ) : null}
          </div>
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="create-notification-form">
            Create notification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
