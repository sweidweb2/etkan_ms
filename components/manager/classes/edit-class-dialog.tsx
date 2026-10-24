"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import {
  loadClassEditOptionsAction,
  updateClassAction,
} from "@/app/manager/classes/actions";
import { FieldLabel } from "@/components/auth/field-label";
import { ClassCoverField } from "@/components/manager/classes/class-cover-field";
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
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useZodForm } from "@/hooks/use-zod-form";
import { CLASS_STATUSES } from "@/lib/constants/manager-class-status";
import { MANAGER_CLASS_STATUS_LABELS } from "@/lib/constants/manager-class-display";
import {
  CLASS_STATUS_VALUES,
  updateClassSchema,
  type SubjectTaskMode,
  type UpdateClassInput,
} from "@/lib/validators/manager/update-class";
import type {
  ManagerClassSemesterOption,
  ManagerClassSubjectOption,
  UpdateClassActionState,
} from "@/types/manager-class-detail";
import type { ManagerClassRow } from "@/types/manager-class-list";

const SEMESTER_UNLINKED = "unlinked";

const SUBJECT_TASK_MODE_OPTIONS: ReadonlyArray<{
  value: SubjectTaskMode;
  label: string;
  description: string;
}> = [
  {
    value: "keep",
    label: "Keep current class tasks",
    description:
      "Existing class tasks and student work stay as they are. Nothing is copied from the new subject.",
  },
  {
    value: "replace",
    label: "Replace from new subject",
    description:
      "Deletes all current class tasks (including student grades and uploads) and clones the new subject's tasks.",
  },
];

const initialState: UpdateClassActionState = {};

type EditClassDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classRow: ManagerClassRow | null;
  subjectOptions: ManagerClassSubjectOption[];
  semesterOptions: ManagerClassSemesterOption[];
  onClassUpdated: (classRow: ManagerClassRow) => void;
};

export function EditClassDialog({
  open,
  onOpenChange,
  classRow,
  subjectOptions: subjectOptionsProp,
  semesterOptions: semesterOptionsProp,
  onClassUpdated,
}: EditClassDialogProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateClassAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [isOptimizingCover, setIsOptimizingCover] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const coverFileRef = useRef<File | null>(null);
  const [fetchedOptions, setFetchedOptions] = useState<{
    subjects: ManagerClassSubjectOption[];
    semesters: ManagerClassSemesterOption[];
  } | null>(null);

  const needsFetch =
    subjectOptionsProp.length === 0 && semesterOptionsProp.length === 0;
  const subjectOptions = needsFetch
    ? (fetchedOptions?.subjects ?? [])
    : subjectOptionsProp;
  const semesterOptions = needsFetch
    ? (fetchedOptions?.semesters ?? [])
    : semesterOptionsProp;
  const isLoadingOptions = open && needsFetch && fetchedOptions === null;

  const isDialogBusy = isPending || isOptimizingCover;
  const handleOpenChange = usePendingAwareOpenChange(
    isDialogBusy,
    (nextOpen) => {
      if (!nextOpen) {
        setFetchedOptions(null);
      }
      onOpenChange(nextOpen);
    }
  );

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: updateClassSchema,
    mode: "onBlur",
    defaultValues: {
      name: "",
      subject_id: "",
      status: CLASS_STATUSES.SCHEDULED,
      semester_id: "",
      subject_task_mode: undefined,
    },
  });

  const selectedSubjectId = watch("subject_id");
  const selectedStatus = watch("status");
  const selectedSemesterId = watch("semester_id");
  const selectedSubjectTaskMode = watch("subject_task_mode");
  const isSubjectChanged = Boolean(
    classRow &&
      selectedSubjectId &&
      selectedSubjectId !== (classRow.subject_id ?? "")
  );

  const subjectSelectItems = subjectOptions.map((subject) => ({
    value: subject.id,
    label: subject.name,
  }));

  const statusSelectItems = CLASS_STATUS_VALUES.map((status) => ({
    value: status,
    label: MANAGER_CLASS_STATUS_LABELS[status],
  }));

  const semesterSelectItems = [
    { value: SEMESTER_UNLINKED, label: "No semester" },
    ...semesterOptions.map((semester) => ({
      value: semester.id,
      label: semester.name,
    })),
  ];

  useEffect(() => {
    if (!open || !classRow) {
      return;
    }

    reset({
      name: classRow.name,
      subject_id: classRow.subject_id,
      status: classRow.status as UpdateClassInput["status"],
      semester_id: classRow.semester_id ?? SEMESTER_UNLINKED,
      subject_task_mode: undefined,
    });
  }, [classRow, open, reset]);

  useEffect(() => {
    if (!open || !needsFetch) {
      return;
    }

    let cancelled = false;
    void loadClassEditOptionsAction().then((options) => {
      if (!cancelled) {
        setFetchedOptions({
          subjects: options.subjects,
          semesters: options.semesters,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, needsFetch]);

  useActionStateSuccess(
    state,
    isPending,
    (nextState) => {
      if (!nextState.classRow) {
        return;
      }

      const updated = nextState.classRow;
      if (!coverFileRef.current) {
        onClassUpdated(updated);
        onOpenChange(false);
        return;
      }

      setUploadComplete(true);
      window.setTimeout(() => {
        onClassUpdated(updated);
        onOpenChange(false);
      }, 220);
    },
    (nextState) => Boolean(nextState.success && nextState.classRow)
  );

  function onSubmit(values: UpdateClassInput) {
    if (!classRow) {
      return;
    }

    const subjectChanged = values.subject_id !== (classRow.subject_id ?? "");
    if (subjectChanged && !values.subject_task_mode) {
      setError("subject_task_mode", {
        type: "required",
        message:
          "Choose whether to keep current class tasks or replace them from the new subject.",
      });
      return;
    }

    const formData = new FormData();
    formData.set("class_id", classRow.id);
    formData.set("name", values.name);
    formData.set("subject_id", values.subject_id);
    formData.set("status", values.status);
    formData.set(
      "semester_id",
      values.semester_id && values.semester_id !== SEMESTER_UNLINKED
        ? values.semester_id
        : SEMESTER_UNLINKED
    );
    if (coverFile) {
      formData.set("image", coverFile);
    } else if (removeCover) {
      formData.set("remove_image", "1");
    }
    coverFileRef.current = coverFile;
    setUploadComplete(false);
    if (subjectChanged && values.subject_task_mode) {
      formData.set("subject_task_mode", values.subject_task_mode);
    }

    startTransition(() => {
      formAction(formData);
    });
  }

  const nameError = errors.name?.message ?? state.fieldErrors?.name?.[0];
  const subjectError =
    errors.subject_id?.message ?? state.fieldErrors?.subject_id?.[0];
  const statusError = errors.status?.message ?? state.fieldErrors?.status?.[0];
  const semesterError = state.fieldErrors?.semester_id?.[0];
  const subjectTaskModeError =
    errors.subject_task_mode?.message ??
    state.fieldErrors?.subject_task_mode?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isDialogBusy}>
        <DialogHeader>
          <DialogTitle>Edit class</DialogTitle>
          <DialogDescription>
            Update class details for {classRow?.name ?? "this class"}.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-class-form"
          onSubmit={(event) => {
            void handleSubmit(onSubmit)(event);
          }}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-class-name"
              label="Name"
              hint="Required"
            />
            <Input
              id="edit-class-name"
              aria-invalid={!!nameError}
              disabled={isPending}
              {...register("name")}
            />
            {nameError ? (
              <p className="text-sm text-destructive">{nameError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-class-subject"
              label="Subject"
              hint="Required"
            />
            {isLoadingOptions ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <InlineSpinner />
                Loading options…
              </div>
            ) : (
              <Select
                value={selectedSubjectId || null}
                items={subjectSelectItems}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }

                  setValue("subject_id", value, { shouldValidate: true });
                }}
                disabled={isPending || subjectOptions.length === 0}
              >
                <SelectTrigger
                  id="edit-class-subject"
                  className="w-full"
                  aria-invalid={!!subjectError}
                >
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent align="start">
                  {subjectOptions.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {subjectError ? (
              <p className="text-sm text-destructive">{subjectError}</p>
            ) : null}
          </div>

          {isSubjectChanged ? (
            <fieldset
              className="flex flex-col gap-2 rounded-lg border bg-muted/30 px-3 py-2.5"
              disabled={isPending}
              aria-invalid={!!subjectTaskModeError}
            >
              <legend className="px-1 text-sm font-medium">
                Subject tasks <span className="text-destructive">*</span>
              </legend>
              {SUBJECT_TASK_MODE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-2.5 text-sm"
                >
                  <input
                    type="radio"
                    name="edit-class-subject-task-mode"
                    value={option.value}
                    checked={selectedSubjectTaskMode === option.value}
                    onChange={() => {
                      setValue("subject_task_mode", option.value, {
                        shouldValidate: true,
                      });
                      clearErrors("subject_task_mode");
                    }}
                    className="mt-1 size-4 accent-primary"
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
              {subjectTaskModeError ? (
                <p className="text-sm text-destructive">
                  {subjectTaskModeError}
                </p>
              ) : null}
            </fieldset>
          ) : null}

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-class-status"
              label="Status"
              hint="Required"
            />
            <Select
              value={selectedStatus || null}
              items={statusSelectItems}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValue("status", value as UpdateClassInput["status"], {
                  shouldValidate: true,
                });
              }}
              disabled={isPending}
            >
              <SelectTrigger
                id="edit-class-status"
                className="w-full"
                aria-invalid={!!statusError}
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent align="start">
                {CLASS_STATUS_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {MANAGER_CLASS_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {statusError ? (
              <p className="text-sm text-destructive">{statusError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-class-semester"
              label="Semester"
              hint="Optional"
            />
            {isLoadingOptions ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <InlineSpinner />
                Loading options…
              </div>
            ) : (
              <Select
                value={selectedSemesterId || SEMESTER_UNLINKED}
                items={semesterSelectItems}
                onValueChange={(value) => {
                  setValue("semester_id", value ?? SEMESTER_UNLINKED, {
                    shouldValidate: true,
                  });
                }}
                disabled={isPending}
              >
                <SelectTrigger id="edit-class-semester" className="w-full">
                  <SelectValue placeholder="No semester" />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value={SEMESTER_UNLINKED}>No semester</SelectItem>
                  {semesterOptions.map((semester) => (
                    <SelectItem key={semester.id} value={semester.id}>
                      {semester.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {semesterError ? (
              <p className="text-sm text-destructive">{semesterError}</p>
            ) : null}
          </div>

          <ClassCoverField
            inputId="edit-class-cover"
            active={open}
            disabled={isPending}
            isUploading={isPending && Boolean(coverFile)}
            uploadComplete={uploadComplete}
            allowRemove
            currentImageUrl={classRow?.image_url}
            currentImageAlt={classRow?.name ?? "Class cover"}
            onChange={(value) => {
              setCoverFile(value.file);
              setRemoveCover(value.removed);
              setIsOptimizingCover(value.isOptimizing);
            }}
          />
        </form>

        <DialogFooter className="mt-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isDialogBusy}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-class-form"
            disabled={!classRow || isDialogBusy || isLoadingOptions}
          >
            {isPending || isOptimizingCover ? (
              <>
                <InlineSpinner className="mr-2" />
                {isOptimizingCover ? "Preparing cover" : "Saving"}
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
