"use client";

import { useEffect, useTransition } from "react";
import { useFormActionState as useActionState } from "@/hooks/use-form-action-state";
import {
  createFinancialFormAction,
  updateFinancialFormAction,
} from "@/app/manager/accounting/actions";
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
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  createFinancialFormSchema,
  updateFinancialFormSchema,
  type CreateFinancialFormInput,
  type UpdateFinancialFormInput,
} from "@/lib/validators/manager/upsert-financial-form";
import type {
  ManagerFinancialFormRow,
  UpsertFinancialFormActionState,
} from "@/types/manager-financial-adjustment";

const initialState: UpsertFinancialFormActionState = {};

const booleanDefaults = {
  received_financial_aid_before: false,
  has_deceased_parent: false,
  both_parents_work: false,
  family_hardship: false,
  family_chronic_disease: false,
  student_works: false,
  agreed_to_rules: false,
} as const;

type UpsertFinancialFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sppId: string;
  form: ManagerFinancialFormRow | null;
  onSaved: (form: ManagerFinancialFormRow) => void;
};

function BoolField({
  id,
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

export function UpsertFinancialFormDialog({
  open,
  onOpenChange,
  sppId,
  form,
  onSaved,
}: UpsertFinancialFormDialogProps) {
  const isEdit = form !== null;
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    isEdit ? updateFinancialFormAction : createFinancialFormAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  useActionStateToast(state, isPending);

  const schema = isEdit ? updateFinancialFormSchema : createFinancialFormSchema;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema,
    mode: "onBlur",
    defaultValues: {
      ...(isEdit && form ? { id: form.id } : {}),
      student_payment_phase_id: sppId,
      full_name: form?.full_name ?? "",
      school_or_university: form?.school_or_university ?? "",
      date_of_birth: form?.date_of_birth ?? "",
      phone: form?.phone ?? "",
      parent_phone: form?.parent_phone ?? "",
      current_gpa: form?.current_gpa ?? "",
      certificates: form?.certificates ?? "",
      family_members: form?.family_members ?? null,
      working_family_members: form?.working_family_members ?? null,
      total_family_income: form?.total_family_income ?? null,
      children_currently_learning: form?.children_currently_learning ?? null,
      affordable_monthly_payment: form?.affordable_monthly_payment ?? null,
      student_monthly_income: form?.student_monthly_income ?? null,
      ...booleanDefaults,
      received_financial_aid_before:
        form?.received_financial_aid_before ?? false,
      has_deceased_parent: form?.has_deceased_parent ?? false,
      both_parents_work: form?.both_parents_work ?? false,
      family_hardship: form?.family_hardship ?? false,
      family_chronic_disease: form?.family_chronic_disease ?? false,
      student_works: form?.student_works ?? false,
      agreed_to_rules: form?.agreed_to_rules ?? false,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      ...(isEdit && form ? { id: form.id } : {}),
      student_payment_phase_id: sppId,
      full_name: form?.full_name ?? "",
      school_or_university: form?.school_or_university ?? "",
      date_of_birth: form?.date_of_birth ?? "",
      phone: form?.phone ?? "",
      parent_phone: form?.parent_phone ?? "",
      current_gpa: form?.current_gpa ?? "",
      certificates: form?.certificates ?? "",
      family_members: form?.family_members ?? null,
      working_family_members: form?.working_family_members ?? null,
      total_family_income: form?.total_family_income ?? null,
      children_currently_learning: form?.children_currently_learning ?? null,
      affordable_monthly_payment: form?.affordable_monthly_payment ?? null,
      student_monthly_income: form?.student_monthly_income ?? null,
      received_financial_aid_before:
        form?.received_financial_aid_before ?? false,
      has_deceased_parent: form?.has_deceased_parent ?? false,
      both_parents_work: form?.both_parents_work ?? false,
      family_hardship: form?.family_hardship ?? false,
      family_chronic_disease: form?.family_chronic_disease ?? false,
      student_works: form?.student_works ?? false,
      agreed_to_rules: form?.agreed_to_rules ?? false,
    });
  }, [open, sppId, form, isEdit, reset]);

  useActionStateSuccess(state, isPending, (nextState) => {
    onOpenChange(false);
    if (nextState.form) {
      onSaved(nextState.form);
    }
  });

  function appendOptional(
    formData: FormData,
    key: string,
    value: string | number | null | undefined
  ) {
    if (value === null || value === undefined || value === "") {
      formData.set(key, "");
      return;
    }
    formData.set(key, String(value));
  }

  function onSubmit(values: CreateFinancialFormInput | UpdateFinancialFormInput) {
    const formData = new FormData();
    if (isEdit && "id" in values) {
      formData.set("id", values.id);
    }
    formData.set("student_payment_phase_id", sppId);
    formData.set("full_name", values.full_name);
    appendOptional(formData, "school_or_university", values.school_or_university);
    appendOptional(formData, "date_of_birth", values.date_of_birth);
    appendOptional(formData, "phone", values.phone);
    appendOptional(formData, "parent_phone", values.parent_phone);
    appendOptional(formData, "current_gpa", values.current_gpa);
    formData.set(
      "received_financial_aid_before",
      String(values.received_financial_aid_before)
    );
    appendOptional(formData, "certificates", values.certificates);
    appendOptional(formData, "family_members", values.family_members);
    appendOptional(
      formData,
      "working_family_members",
      values.working_family_members
    );
    appendOptional(formData, "total_family_income", values.total_family_income);
    appendOptional(
      formData,
      "children_currently_learning",
      values.children_currently_learning
    );
    formData.set("has_deceased_parent", String(values.has_deceased_parent));
    formData.set("both_parents_work", String(values.both_parents_work));
    formData.set("family_hardship", String(values.family_hardship));
    formData.set("family_chronic_disease", String(values.family_chronic_disease));
    appendOptional(
      formData,
      "affordable_monthly_payment",
      values.affordable_monthly_payment
    );
    formData.set("student_works", String(values.student_works));
    appendOptional(
      formData,
      "student_monthly_income",
      values.student_monthly_income
    );
    formData.set("agreed_to_rules", String(values.agreed_to_rules));
    startTransition(() => formAction(formData));
  }

  const fullNameError =
    errors.full_name?.message ?? state.fieldErrors?.full_name?.[0];
  const agreedError =
    errors.agreed_to_rules?.message ?? state.fieldErrors?.agreed_to_rules?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        showCloseButton={!isPending}
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit financial form" : "Add financial form"}
          </DialogTitle>
          <DialogDescription>
            Aid application details for this student payment phase. Does not
            change amounts.
          </DialogDescription>
        </DialogHeader>

        <form
          id="upsert-financial-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <FieldLabel
                htmlFor="form-full-name"
                label="Full name"
                hint="Required"
              />
              <Input
                id="form-full-name"
                aria-invalid={!!fullNameError}
                disabled={isPending}
                {...register("full_name")}
              />
              {fullNameError ? (
                <p className="text-sm text-destructive">{fullNameError}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="form-school"
                label="School / university"
                hint="Optional"
              />
              <Input
                id="form-school"
                disabled={isPending}
                {...register("school_or_university")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="form-dob"
                label="Date of birth"
                hint="Optional"
              />
              <Input
                id="form-dob"
                type="date"
                disabled={isPending}
                {...register("date_of_birth")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="form-phone" label="Phone" hint="Optional" />
              <Input id="form-phone" disabled={isPending} {...register("phone")} />
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="form-parent-phone"
                label="Parent phone"
                hint="Optional"
              />
              <Input
                id="form-parent-phone"
                disabled={isPending}
                {...register("parent_phone")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="form-gpa"
                label="Current GPA"
                hint="Optional"
              />
              <Input
                id="form-gpa"
                disabled={isPending}
                {...register("current_gpa")}
              />
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <FieldLabel
                htmlFor="form-certificates"
                label="Certificates"
                hint="Optional"
              />
              <Input
                id="form-certificates"
                disabled={isPending}
                {...register("certificates")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="form-family-members"
                label="Family members"
                hint="Optional"
              />
              <Input
                id="form-family-members"
                type="number"
                min={0}
                step={1}
                disabled={isPending}
                {...register("family_members")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="form-working-members"
                label="Working family members"
                hint="Optional"
              />
              <Input
                id="form-working-members"
                type="number"
                min={0}
                step={1}
                disabled={isPending}
                {...register("working_family_members")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="form-family-income"
                label="Total family income"
                hint="Optional"
              />
              <Input
                id="form-family-income"
                type="number"
                min={0}
                step={0.01}
                disabled={isPending}
                {...register("total_family_income")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="form-children-learning"
                label="Children currently learning"
                hint="Optional"
              />
              <Input
                id="form-children-learning"
                type="number"
                min={0}
                step={1}
                disabled={isPending}
                {...register("children_currently_learning")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="form-affordable"
                label="Affordable monthly payment"
                hint="Optional"
              />
              <Input
                id="form-affordable"
                type="number"
                min={0}
                step={0.01}
                disabled={isPending}
                {...register("affordable_monthly_payment")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="form-student-income"
                label="Student monthly income"
                hint="Optional"
              />
              <Input
                id="form-student-income"
                type="number"
                min={0}
                step={0.01}
                disabled={isPending}
                {...register("student_monthly_income")}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <BoolField
              id="form-aid-before"
              label="Received financial aid before"
              checked={Boolean(watch("received_financial_aid_before"))}
              disabled={isPending}
              onCheckedChange={(checked) =>
                setValue("received_financial_aid_before", checked, {
                  shouldValidate: true,
                })
              }
            />
            <BoolField
              id="form-deceased-parent"
              label="Has deceased parent"
              checked={Boolean(watch("has_deceased_parent"))}
              disabled={isPending}
              onCheckedChange={(checked) =>
                setValue("has_deceased_parent", checked, {
                  shouldValidate: true,
                })
              }
            />
            <BoolField
              id="form-both-parents-work"
              label="Both parents work"
              checked={Boolean(watch("both_parents_work"))}
              disabled={isPending}
              onCheckedChange={(checked) =>
                setValue("both_parents_work", checked, { shouldValidate: true })
              }
            />
            <BoolField
              id="form-hardship"
              label="Family hardship"
              checked={Boolean(watch("family_hardship"))}
              disabled={isPending}
              onCheckedChange={(checked) =>
                setValue("family_hardship", checked, { shouldValidate: true })
              }
            />
            <BoolField
              id="form-chronic"
              label="Family chronic disease"
              checked={Boolean(watch("family_chronic_disease"))}
              disabled={isPending}
              onCheckedChange={(checked) =>
                setValue("family_chronic_disease", checked, {
                  shouldValidate: true,
                })
              }
            />
            <BoolField
              id="form-student-works"
              label="Student works"
              checked={Boolean(watch("student_works"))}
              disabled={isPending}
              onCheckedChange={(checked) =>
                setValue("student_works", checked, { shouldValidate: true })
              }
            />
          </div>

          <div className="flex flex-col gap-2">
            <BoolField
              id="form-agreed"
              label="Agreed to rules (required)"
              checked={Boolean(watch("agreed_to_rules"))}
              disabled={isPending}
              onCheckedChange={(checked) =>
                setValue("agreed_to_rules", checked, { shouldValidate: true })
              }
            />
            {agreedError ? (
              <p className="text-sm text-destructive">{agreedError}</p>
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
          <Button type="submit" form="upsert-financial-form" disabled={isPending}>
            {isPending ? <InlineSpinner /> : null}
            {isEdit ? "Save form" : "Create form"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
