"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import { updateSubjectTaskAction } from "@/app/manager/subjects/actions";
import {
  deleteTaskAttachmentAction,
  getTaskAttachmentSignedUrlAction,
  uploadTaskAttachmentAction,
} from "@/app/manager/classes/actions";
import { Can } from "@/components/auth/can";
import { FieldLabel } from "@/components/auth/field-label";
import { DetailField } from "@/components/manager/shared/detail-field";
import { TaskYesNoField } from "@/components/manager/shared/task-yes-no-field";
import { TaskAttachmentsSection } from "@/components/tasks/task-attachments-section";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePermissions } from "@/components/auth/permissions-provider";
import {
  serializeTaskMaxGrade,
  useTaskYesNoToggle,
} from "@/hooks/use-task-yes-no-toggle";
import { useZodForm } from "@/hooks/use-zod-form";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import { TASK_ATTACHMENT_ENTITIES } from "@/lib/constants/task-attachments";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { formatTaskMaxGrade } from "@/lib/format/format-task-grade";
import { subjectTaskFieldsSchema } from "@/lib/validators/manager/create-subject-task";
import { cn } from "@/lib/utils";
import type {
  ManagerSubjectTaskRow,
  UpdateSubjectTaskActionState,
} from "@/types/manager-subject-task";
import type { TaskAttachmentRow } from "@/types/task-attachment";
import { PencilIcon, Trash2Icon } from "lucide-react";

type SubjectTaskDetailPanelProps = {
  subjectId: string;
  task: ManagerSubjectTaskRow;
  attachments: TaskAttachmentRow[];
  isEditing: boolean;
  onEditingChange: (editing: boolean) => void;
  onSaved: (task: ManagerSubjectTaskRow) => void;
  onAttachmentsChange: (rows: TaskAttachmentRow[]) => void;
  onDelete: () => void;
};

function getDefaultValues(task: ManagerSubjectTaskRow) {
  return {
    title: task.title,
    description: task.description ?? "",
    period: task.period,
    max_grade: task.max_grade ?? "",
    is_yes_no: task.is_yes_no,
    sort_order: task.sort_order,
  };
}

export function SubjectTaskDetailPanel({
  subjectId,
  task,
  attachments,
  isEditing,
  onEditingChange,
  onSaved,
  onAttachmentsChange,
  onDelete,
}: SubjectTaskDetailPanelProps) {
  const permissions = usePermissions();
  const canUpdate = hasPermissionInSet(
    permissions,
    PERMISSIONS.SUBJECTS_TASKS_UPDATE
  );
  const canDelete = hasPermissionInSet(
    permissions,
    PERMISSIONS.SUBJECTS_TASKS_DELETE
  );
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateSubjectTaskAction,
    {} as UpdateSubjectTaskActionState
  );
  const isPending = isTransitionPending || isActionPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useZodForm({
    schema: subjectTaskFieldsSchema,
    mode: "onBlur",
    defaultValues: getDefaultValues(task),
  });
  const isYesNo = Boolean(watch("is_yes_no"));
  const { onYesNoChange, resetYesNoToggle } = useTaskYesNoToggle({
    getMaxGrade: () => getValues("max_grade"),
    setMaxGrade: (value) =>
      setValue("max_grade", value, { shouldValidate: true }),
    setIsYesNo: (value) =>
      setValue("is_yes_no", value, { shouldDirty: true }),
  });

  useEffect(() => {
    reset(getDefaultValues(task));
    resetYesNoToggle();
  }, [task, reset, resetYesNoToggle]);

  useActionStateToast(state, isPending);
  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      if (!nextState.task) {
        return;
      }
      onSaved(nextState.task);
      onEditingChange(false);
    },
    (nextState) => Boolean(nextState.success && nextState.task)
  );

  function onSubmit(values: {
    title: string;
    description?: string;
    period: number;
    max_grade?: "" | number;
    is_yes_no?: boolean;
    sort_order: number;
  }) {
    const formData = new FormData();
    formData.set("subject_id", subjectId);
    formData.set("id", task.id);
    formData.set("title", values.title);
    formData.set("description", values.description ?? "");
    formData.set("period", String(values.period));
    formData.set("sort_order", String(values.sort_order));
    formData.set("is_yes_no", values.is_yes_no ? "true" : "false");
    formData.set(
      "max_grade",
      serializeTaskMaxGrade(values.max_grade, values.is_yes_no)
    );
    startTransition(() => {
      formAction(formData);
    });
  }

  const titleError = errors.title?.message ?? state.fieldErrors?.title?.[0];
  const periodError = errors.period?.message ?? state.fieldErrors?.period?.[0];
  const descriptionError =
    errors.description?.message ?? state.fieldErrors?.description?.[0];
  const maxGradeError =
    errors.max_grade?.message ?? state.fieldErrors?.max_grade?.[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 pb-2">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-4">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
            Task template
          </p>
          <h2 className="truncate text-xl font-semibold tracking-tight">
            {task.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sort order {task.sort_order}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canUpdate && !isEditing ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shadow-sm"
              onClick={() => onEditingChange(true)}
            >
              <PencilIcon data-icon="inline-start" />
              Edit
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete task ${task.title}`}
              disabled={isPending}
              onClick={onDelete}
            >
              <Trash2Icon className="text-destructive" />
            </Button>
          ) : null}
        </div>
      </div>

      {isEditing && canUpdate ? (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-background/80 p-5 shadow-sm"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="subject-task-detail-title" label="Title" hint="Required" />
            <Input
              id="subject-task-detail-title"
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
              htmlFor="subject-task-detail-description"
              label="Description"
              hint="Optional"
            />
            <textarea
              id="subject-task-detail-description"
              rows={3}
              aria-invalid={!!descriptionError}
              disabled={isPending}
              className={cn(
                "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
              )}
              {...register("description")}
            />
            {descriptionError ? (
              <p className="text-sm text-destructive">{descriptionError}</p>
            ) : null}
          </div>

          <TaskYesNoField
            id="subject-task-detail-yes-no"
            checked={isYesNo}
            onCheckedChange={onYesNoChange}
            disabled={isPending}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="subject-task-detail-period"
                label="Period (days)"
                hint="Required"
              />
              <Input
                id="subject-task-detail-period"
                type="number"
                min={1}
                step={1}
                aria-invalid={!!periodError}
                disabled={isPending}
                {...register("period")}
              />
              {periodError ? (
                <p className="text-sm text-destructive">{periodError}</p>
              ) : null}
            </div>
            {isYesNo ? null : (
              <div className="flex flex-col gap-2">
                <FieldLabel
                  htmlFor="subject-task-detail-max-grade"
                  label="Max grade"
                  hint="Optional"
                />
                <Input
                  id="subject-task-detail-max-grade"
                  type="number"
                  min={0}
                  max={999}
                  step={0.5}
                  aria-invalid={!!maxGradeError}
                  disabled={isPending}
                  {...register("max_grade")}
                />
                {maxGradeError ? (
                  <p className="text-sm text-destructive">{maxGradeError}</p>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                reset(getDefaultValues(task));
                resetYesNoToggle();
                onEditingChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <InlineSpinner className="mr-2" /> : null}
              Save changes
            </Button>
          </div>
        </form>
      ) : (
        <dl className="grid gap-5 rounded-2xl border border-border/70 bg-background/80 p-5 shadow-sm sm:grid-cols-2">
          <DetailField label="Title" value={task.title} className="sm:col-span-2" />
          <DetailField
            label="Description"
            value={task.description?.trim() ? task.description : "—"}
            className="sm:col-span-2"
            valueClassName="whitespace-pre-wrap"
          />
          <DetailField
            label={task.is_yes_no ? "Grading" : "Max grade"}
            value={formatTaskMaxGrade({
              maxGrade: task.max_grade,
              isYesNo: task.is_yes_no,
            })}
            className="tabular-nums"
          />
          <DetailField
            label="Period (days)"
            value={String(task.period)}
            className="tabular-nums"
          />
        </dl>
      )}

      <Can permission={PERMISSIONS.SUBJECTS_TASKS_VIEW}>
        <TaskAttachmentsSection
          entity={TASK_ATTACHMENT_ENTITIES.SUBJECT_TASK}
          entityId={task.id}
          attachments={attachments}
          canMutate={canUpdate}
          collapsible={false}
          uploadAction={uploadTaskAttachmentAction}
          deleteAction={deleteTaskAttachmentAction}
          getSignedUrlAction={getTaskAttachmentSignedUrlAction}
          onAttachmentsChange={onAttachmentsChange}
        />
      </Can>
    </div>
  );
}
