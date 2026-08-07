"use client";

import { useActionState, useTransition } from "react";
import { submitPublicFinancialFormAction } from "@/app/(public)/f/actions";
import { FieldLabel } from "@/components/auth/field-label";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useZodForm } from "@/hooks/use-zod-form";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import {
  submitPublicFinancialFormSchema,
  type SubmitPublicFinancialFormInput,
} from "@/lib/validators/manager/upsert-financial-form";
import type {
  PublicFinancialFormInviteContext,
  SubmitPublicFinancialFormActionState,
} from "@/types/manager-financial-adjustment";

const initialState: SubmitPublicFinancialFormActionState = {};

const booleanDefaults = {
  received_financial_aid_before: false,
  has_deceased_parent: false,
  both_parents_work: false,
  family_hardship: false,
  family_chronic_disease: false,
  student_works: false,
  agreed_to_rules: false,
} as const;

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

function ScholarshipInfoCards() {
  const { t } = usePublicI18n();

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg leading-snug">
            {t("scholarship.card1.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>{t("scholarship.card1.intro")}</p>
          <div className="space-y-2">
            <p className="font-medium text-foreground">
              {t("scholarship.card1.conditionsTitle")}
            </p>
            <ul className="list-disc space-y-2 ps-5">
              <li>{t("scholarship.card1.condition1")}</li>
              <li>{t("scholarship.card1.condition2")}</li>
              <li>{t("scholarship.card1.condition3")}</li>
              <li>{t("scholarship.card1.condition4")}</li>
              <li>{t("scholarship.card1.condition5")}</li>
            </ul>
          </div>
          <p className="rounded-md border bg-muted/40 px-3 py-2 text-foreground">
            {t("scholarship.card1.note")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg leading-snug">
            {t("scholarship.card2.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>{t("scholarship.card2.p1")}</p>
          <p>{t("scholarship.card2.p2")}</p>
          <p>{t("scholarship.card2.p3")}</p>
          <p>{t("scholarship.card2.p4")}</p>
          <p>{t("scholarship.card2.p5")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

type PublicFinancialFormProps = {
  context: PublicFinancialFormInviteContext;
};

export function PublicFinancialForm({ context }: PublicFinancialFormProps) {
  const { t } = usePublicI18n();
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    submitPublicFinancialFormAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: submitPublicFinancialFormSchema,
    mode: "onBlur",
    defaultValues: {
      token: context.token,
      full_name: "",
      school_or_university: "",
      date_of_birth: "",
      phone: "",
      parent_phone: "",
      current_gpa: "",
      certificates: "",
      family_members: null,
      working_family_members: null,
      total_family_income: null,
      children_currently_learning: null,
      affordable_monthly_payment: null,
      student_monthly_income: null,
      ...booleanDefaults,
    },
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

  function onSubmit(values: SubmitPublicFinancialFormInput) {
    const formData = new FormData();
    formData.set("token", context.token);
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-12 pt-10 sm:pt-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("scholarship.pageTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("scholarship.forStudent")}: {context.student_label} ·{" "}
            {t("scholarship.phase")}: {context.payment_phase_name}
          </p>
        </div>
        <LanguageToggle className="self-start" />
      </div>

      <ScholarshipInfoCards />

      {state.success ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("scholarship.form.submittedTitle")}</CardTitle>
            <CardDescription>
              {t("scholarship.form.submittedBody")}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("scholarship.form.title")}</CardTitle>
            <CardDescription>{t("scholarship.amountsNote")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
              noValidate
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <FieldLabel
                    htmlFor="public-form-full-name"
                    label={t("scholarship.field.fullName")}
                    hint={t("scholarship.hint.required")}
                  />
                  <Input
                    id="public-form-full-name"
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
                    htmlFor="public-form-school"
                    label={t("scholarship.field.school")}
                    hint={t("scholarship.hint.optional")}
                  />
                  <Input
                    id="public-form-school"
                    disabled={isPending}
                    {...register("school_or_university")}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel
                    htmlFor="public-form-dob"
                    label={t("scholarship.field.dob")}
                    hint={t("scholarship.hint.optional")}
                  />
                  <Input
                    id="public-form-dob"
                    type="date"
                    disabled={isPending}
                    {...register("date_of_birth")}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel
                    htmlFor="public-form-phone"
                    label={t("scholarship.field.phone")}
                    hint={t("scholarship.hint.optional")}
                  />
                  <Input
                    id="public-form-phone"
                    disabled={isPending}
                    {...register("phone")}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel
                    htmlFor="public-form-parent-phone"
                    label={t("scholarship.field.parentPhone")}
                    hint={t("scholarship.hint.optional")}
                  />
                  <Input
                    id="public-form-parent-phone"
                    disabled={isPending}
                    {...register("parent_phone")}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <FieldLabel
                    htmlFor="public-form-gpa"
                    label={t("scholarship.field.gpa")}
                    hint={t("scholarship.hint.optional")}
                  />
                  <Input
                    id="public-form-gpa"
                    disabled={isPending}
                    {...register("current_gpa")}
                  />
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                  <FieldLabel
                    htmlFor="public-form-certificates"
                    label={t("scholarship.field.certificates")}
                    hint={t("scholarship.hint.optional")}
                  />
                  <Input
                    id="public-form-certificates"
                    disabled={isPending}
                    {...register("certificates")}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <FieldLabel
                    htmlFor="public-form-family-members"
                    label={t("scholarship.field.familyMembers")}
                    hint={t("scholarship.hint.optional")}
                  />
                  <Input
                    id="public-form-family-members"
                    type="number"
                    min={0}
                    step={1}
                    disabled={isPending}
                    {...register("family_members")}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <FieldLabel
                    htmlFor="public-form-working-members"
                    label={t("scholarship.field.workingFamilyMembers")}
                    hint={t("scholarship.hint.optional")}
                  />
                  <Input
                    id="public-form-working-members"
                    type="number"
                    min={0}
                    step={1}
                    disabled={isPending}
                    {...register("working_family_members")}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <FieldLabel
                    htmlFor="public-form-family-income"
                    label={t("scholarship.field.totalFamilyIncome")}
                    hint={t("scholarship.hint.optional")}
                  />
                  <Input
                    id="public-form-family-income"
                    type="number"
                    min={0}
                    step={0.01}
                    disabled={isPending}
                    {...register("total_family_income")}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <FieldLabel
                    htmlFor="public-form-children-learning"
                    label={t("scholarship.field.childrenLearning")}
                    hint={t("scholarship.hint.optional")}
                  />
                  <Input
                    id="public-form-children-learning"
                    type="number"
                    min={0}
                    step={1}
                    disabled={isPending}
                    {...register("children_currently_learning")}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <FieldLabel
                    htmlFor="public-form-affordable"
                    label={t("scholarship.field.affordablePayment")}
                    hint={t("scholarship.hint.optional")}
                  />
                  <Input
                    id="public-form-affordable"
                    type="number"
                    min={0}
                    step={0.01}
                    disabled={isPending}
                    {...register("affordable_monthly_payment")}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <FieldLabel
                    htmlFor="public-form-student-income"
                    label={t("scholarship.field.studentIncome")}
                    hint={t("scholarship.hint.optional")}
                  />
                  <Input
                    id="public-form-student-income"
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
                  id="public-form-aid-before"
                  label={t("scholarship.field.aidBefore")}
                  checked={Boolean(watch("received_financial_aid_before"))}
                  disabled={isPending}
                  onCheckedChange={(checked) =>
                    setValue("received_financial_aid_before", checked, {
                      shouldValidate: true,
                    })
                  }
                />
                <BoolField
                  id="public-form-deceased-parent"
                  label={t("scholarship.field.deceasedParent")}
                  checked={Boolean(watch("has_deceased_parent"))}
                  disabled={isPending}
                  onCheckedChange={(checked) =>
                    setValue("has_deceased_parent", checked, {
                      shouldValidate: true,
                    })
                  }
                />
                <BoolField
                  id="public-form-both-parents-work"
                  label={t("scholarship.field.bothParentsWork")}
                  checked={Boolean(watch("both_parents_work"))}
                  disabled={isPending}
                  onCheckedChange={(checked) =>
                    setValue("both_parents_work", checked, {
                      shouldValidate: true,
                    })
                  }
                />
                <BoolField
                  id="public-form-hardship"
                  label={t("scholarship.field.hardship")}
                  checked={Boolean(watch("family_hardship"))}
                  disabled={isPending}
                  onCheckedChange={(checked) =>
                    setValue("family_hardship", checked, {
                      shouldValidate: true,
                    })
                  }
                />
                <BoolField
                  id="public-form-chronic"
                  label={t("scholarship.field.chronicDisease")}
                  checked={Boolean(watch("family_chronic_disease"))}
                  disabled={isPending}
                  onCheckedChange={(checked) =>
                    setValue("family_chronic_disease", checked, {
                      shouldValidate: true,
                    })
                  }
                />
                <BoolField
                  id="public-form-student-works"
                  label={t("scholarship.field.studentWorks")}
                  checked={Boolean(watch("student_works"))}
                  disabled={isPending}
                  onCheckedChange={(checked) =>
                    setValue("student_works", checked, {
                      shouldValidate: true,
                    })
                  }
                />
              </div>

              <div className="flex flex-col gap-2">
                <BoolField
                  id="public-form-agreed"
                  label={t("scholarship.field.agreed")}
                  checked={Boolean(watch("agreed_to_rules"))}
                  disabled={isPending}
                  onCheckedChange={(checked) =>
                    setValue("agreed_to_rules", checked, {
                      shouldValidate: true,
                    })
                  }
                />
                {agreedError ? (
                  <p className="text-sm text-destructive">{agreedError}</p>
                ) : null}
              </div>

              {state.error && !state.fieldErrors ? (
                <p className="text-sm text-destructive">{state.error}</p>
              ) : null}

              <Button type="submit" disabled={isPending} className="self-start">
                {isPending ? <InlineSpinner /> : null}
                {t("scholarship.form.submit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

type PublicFinancialFormStatusProps = {
  status: "invalid" | "used";
};

export function PublicFinancialFormStatus({
  status,
}: PublicFinancialFormStatusProps) {
  const { t } = usePublicI18n();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-12 pt-10 sm:pt-14">
      <div className="flex justify-end">
        <LanguageToggle />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {status === "invalid"
              ? t("scholarship.form.invalidTitle")
              : t("scholarship.form.usedTitle")}
          </CardTitle>
          <CardDescription>
            {status === "invalid"
              ? t("scholarship.form.invalidBody")
              : t("scholarship.form.usedBody")}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
