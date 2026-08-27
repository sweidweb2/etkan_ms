"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { CheckIcon } from "lucide-react";
import { submitPublicRegistrationAction } from "@/app/(public)/register/actions";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import {
  RegistrationDocumentsStep,
  type RegistrationDocumentRemoveAction,
  type RegistrationDocumentUploadAction,
  type RegistrationUploadedDocument,
} from "@/components/public/registration/registration-documents-step";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "@/components/public/registration/turnstile-widget";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import {
  REGISTRATION_BLOOD_TYPE_LABELS,
  REGISTRATION_BLOOD_TYPE_VALUES,
  REGISTRATION_DOCUMENT_MAX_FILES,
  REGISTRATION_EDUCATION_LEVEL_LABELS,
  REGISTRATION_EDUCATION_LEVEL_VALUES,
  REGISTRATION_GENDER_LABELS,
  REGISTRATION_GENDER_VALUES,
  REGISTRATION_ID_DOCUMENT_TYPE_LABELS,
  REGISTRATION_JOB_STATUS_LABELS,
  REGISTRATION_JOB_STATUS_VALUES,
  REGISTRATION_LEARNING_STATUS_LABELS,
  REGISTRATION_LEARNING_STATUS_VALUES,
  REGISTRATION_LEARNING_STATUSES,
  REGISTRATION_PREFERRED_PROGRAM_LABELS,
  REGISTRATION_PREFERRED_PROGRAM_VALUES,
  REGISTRATION_REFERRAL_SOURCE_LABELS,
  REGISTRATION_REFERRAL_SOURCE_VALUES,
  REGISTRATION_REFERRAL_SOURCES,
  REGISTRATION_SHIFT_LABELS,
  REGISTRATION_SHIFT_VALUES,
  REGISTRATION_SKILL_LABELS,
  REGISTRATION_SKILL_VALUES,
  REGISTRATION_SKILLS,
  REGISTRATION_STEP_LABELS,
  REGISTRATION_STEPS,
  REGISTRATION_WEEKDAY_LABELS,
  REGISTRATION_WEEKDAY_VALUES,
  type RegistrationStep,
} from "@/lib/constants/public-registration";
import {
  TURNSTILE_REGISTER_ACTION,
  TURNSTILE_TOKEN_FIELD,
} from "@/lib/constants/turnstile";
import {
  PublicI18nBoundary,
  usePublicI18n,
} from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";
import {
  isUnder18RegistrationDob,
  registrationAvailabilityStepSchema,
  registrationContactStepSchema,
  registrationDocumentsStepSchema,
  registrationEducationStepSchema,
  registrationPersonalStepSchema,
  registrationReviewStepSchema,
  registrationSkillsStepSchema,
} from "@/lib/validators/public/registration";
import type { SubmitPublicRegistrationActionState } from "@/types/public-registration";

const initialState: SubmitPublicRegistrationActionState = {};

function RegLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <Label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
      {children}
      {required ? <span className="text-destructive"> *</span> : null}
    </Label>
  );
}

type Draft = {
  full_name: string;
  gender: string;
  date_of_birth: string;
  blood_type: string;
  email: string;
  phone: string;
  additional_phone: string;
  city: string;
  full_address: string;
  education_level: string;
  organization_name: string;
  speciality: string;
  learning_status: string;
  graduation_year: string;
  self_learning_notes: string;
  learning_goal: string;
  skills: string[];
  referral_source: string;
  referral_other: string;
  skills_other: string;
  preferred_program: string;
  available_days: string[];
  preferred_shifts: string[];
  weekly_available_hours: string;
  job_status: string;
  has_transportation: boolean | null;
  upload_session_id: string;
  id_document_type: string;
  documents: RegistrationUploadedDocument[];
  consent_terms: boolean;
  consent_privacy: boolean;
  guardian_name: string;
  guardian_phone: string;
};

function createEmptyDraft(): Draft {
  return {
    full_name: "",
    gender: "",
    date_of_birth: "",
    blood_type: "",
    email: "",
    phone: "",
    additional_phone: "",
    city: "",
    full_address: "",
    education_level: "",
    organization_name: "",
    speciality: "",
    learning_status: "",
    graduation_year: "",
    self_learning_notes: "",
    learning_goal: "",
    skills: [],
    referral_source: "",
    referral_other: "",
    skills_other: "",
    preferred_program: "",
    available_days: [],
    preferred_shifts: [],
    weekly_available_hours: "",
    job_status: "",
    has_transportation: null,
    upload_session_id: crypto.randomUUID(),
    id_document_type: "",
    documents: [],
    consent_terms: false,
    consent_privacy: false,
    guardian_name: "",
    guardian_phone: "",
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-destructive">{message}</p>;
}

function toggleInArray(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function ChipGroup({
  options,
  labels,
  selected,
  disabled,
  onToggle,
}: {
  options: readonly string[];
  labels: Record<string, string>;
  selected: string[];
  disabled?: boolean;
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((value) => {
        const isSelected = selected.includes(value);
        return (
          <button
            key={value}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted/60"
            )}
          >
            {labels[value] ?? value}
          </button>
        );
      })}
    </div>
  );
}

type RegistrationWizardMode = "public" | "guest-public" | "guest-staff";

type RegistrationWizardProps = {
  mode?: RegistrationWizardMode;
  submitAction?: (
    prevState: SubmitPublicRegistrationActionState,
    formData: FormData
  ) => Promise<SubmitPublicRegistrationActionState>;
  initialDraft?: Partial<Draft>;
  ageHint?: number | null;
  inviteToken?: string;
  guestId?: string;
  hidePageHeader?: boolean;
  documentUploadAction?: RegistrationDocumentUploadAction;
  documentRemoveAction?: RegistrationDocumentRemoveAction;
  onSuccess?: () => void;
  onPendingChange?: (isPending: boolean) => void;
};

function createDraft(initial?: Partial<Draft>): Draft {
  return {
    ...createEmptyDraft(),
    ...initial,
    upload_session_id: initial?.upload_session_id ?? crypto.randomUUID(),
    documents: initial?.documents ?? [],
    skills: initial?.skills ?? [],
    skills_other: initial?.skills_other ?? "",
    available_days: initial?.available_days ?? [],
    preferred_shifts: initial?.preferred_shifts ?? [],
  };
}

export function RegistrationWizard(props: RegistrationWizardProps = {}) {
  return (
    <PublicI18nBoundary>
      <RegistrationWizardContent {...props} />
    </PublicI18nBoundary>
  );
}

function RegistrationWizardContent({
  mode = "public",
  submitAction = submitPublicRegistrationAction,
  initialDraft,
  ageHint = null,
  inviteToken,
  guestId,
  hidePageHeader = false,
  documentUploadAction,
  documentRemoveAction,
  onSuccess,
  onPendingChange,
}: RegistrationWizardProps) {
  const { t } = usePublicI18n();
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => createDraft(initialDraft));
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [isDocumentBusy, setIsDocumentBusy] = useState(false);
  const [state, formAction, isActionPending] = useActionState(
    submitAction,
    initialState
  );
  const [isTransitionPending, startTransition] = useTransition();
  const isSubmitPending = isActionPending || isTransitionPending;
  const isPending = isSubmitPending || isDocumentBusy;
  const requireTurnstile = mode === "public";
  const turnstileSiteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const wasSubmitPendingRef = useRef(false);

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  useActionStateToast(state, isSubmitPending);
  useActionStateSuccess(state, isSubmitPending, () => {
    onSuccess?.();
  });

  useEffect(() => {
    if (
      requireTurnstile &&
      wasSubmitPendingRef.current &&
      !isSubmitPending &&
      !state.success
    ) {
      turnstileRef.current?.reset();
      setTurnstileToken("");
    }
    wasSubmitPendingRef.current = isSubmitPending;
  }, [isSubmitPending, requireTurnstile, state.success]);

  const step = REGISTRATION_STEPS[stepIndex]!;
  const needsGraduationYear =
    draft.learning_status === REGISTRATION_LEARNING_STATUSES.GRADUATED ||
    draft.learning_status === REGISTRATION_LEARNING_STATUSES.STOPPED;
  const showGuardian = useMemo(
    () =>
      Boolean(
        draft.date_of_birth &&
          /^\d{4}-\d{2}-\d{2}$/.test(draft.date_of_birth) &&
          isUnder18RegistrationDob(draft.date_of_birth)
      ),
    [draft.date_of_birth]
  );

  function patchDraft(partial: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  function validateCurrentStep(): boolean {
    setStepErrors({});
    let result;
    if (step === "personal") {
      result = registrationPersonalStepSchema.safeParse({
        full_name: draft.full_name,
        gender: draft.gender,
        date_of_birth: draft.date_of_birth,
        blood_type: draft.blood_type,
      });
    } else if (step === "contact") {
      result = registrationContactStepSchema.safeParse({
        email: draft.email,
        phone: draft.phone,
        additional_phone: draft.additional_phone,
        city: draft.city,
        full_address: draft.full_address,
      });
    } else if (step === "education") {
      const yearRaw = draft.graduation_year.trim();
      result = registrationEducationStepSchema.safeParse({
        education_level: draft.education_level,
        organization_name: draft.organization_name,
        speciality: draft.speciality,
        learning_status: draft.learning_status,
        graduation_year: yearRaw === "" ? null : Number(yearRaw),
        self_learning_notes: draft.self_learning_notes,
        learning_goal: draft.learning_goal,
      });
    } else if (step === "skills") {
      result = registrationSkillsStepSchema.safeParse({
        skills: draft.skills,
        referral_source: draft.referral_source,
        referral_other: draft.referral_other,
        skills_other: draft.skills_other,
        preferred_program: draft.preferred_program,
      });
    } else if (step === "availability") {
      result = registrationAvailabilityStepSchema.safeParse({
        available_days: draft.available_days,
        preferred_shifts: draft.preferred_shifts,
        weekly_available_hours: Number(draft.weekly_available_hours),
        job_status: draft.job_status,
        has_transportation: draft.has_transportation,
      });
    } else if (step === "documents") {
      result = registrationDocumentsStepSchema.safeParse({
        id_document_type: draft.id_document_type,
        documents: draft.documents,
      });
    } else {
      result = registrationReviewStepSchema.safeParse({
        date_of_birth: draft.date_of_birth,
        consent_terms: draft.consent_terms,
        consent_privacy: draft.consent_privacy,
        guardian_name: draft.guardian_name,
        guardian_phone: draft.guardian_phone,
      });
    }

    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const next: Record<string, string> = {};
      for (const [key, messages] of Object.entries(flat)) {
        if (messages?.[0]) next[key] = messages[0];
      }
      setStepErrors(next);
      return false;
    }
    return true;
  }

  function handleNext() {
    if (!validateCurrentStep()) return;
    setStepIndex((current) =>
      Math.min(current + 1, REGISTRATION_STEPS.length - 1)
    );
  }

  function handleBack() {
    setStepErrors({});
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  function handleSubmit() {
    if (!validateCurrentStep()) return;
    if (requireTurnstile && !turnstileToken) {
      setStepErrors((current) => ({
        ...current,
        turnstile: t("registration.turnstile.required"),
      }));
      return;
    }
    const formData = new FormData();

    formData.set("full_name", draft.full_name);
    formData.set("gender", draft.gender);
    formData.set("date_of_birth", draft.date_of_birth);
    formData.set("blood_type", draft.blood_type);
    formData.set("email", draft.email);
    formData.set("phone", draft.phone);
    formData.set("additional_phone", draft.additional_phone);
    formData.set("city", draft.city);
    formData.set("full_address", draft.full_address);
    formData.set("education_level", draft.education_level);
    formData.set("organization_name", draft.organization_name);
    formData.set("speciality", draft.speciality);
    formData.set("learning_status", draft.learning_status);
    formData.set("graduation_year", draft.graduation_year);
    formData.set("self_learning_notes", draft.self_learning_notes);
    formData.set("learning_goal", draft.learning_goal);
    formData.set("skills", JSON.stringify(draft.skills));
    formData.set("referral_source", draft.referral_source);
    formData.set("referral_other", draft.referral_other);
    formData.set("skills_other", draft.skills_other);
    formData.set("preferred_program", draft.preferred_program);
    formData.set("available_days", JSON.stringify(draft.available_days));
    formData.set("preferred_shifts", JSON.stringify(draft.preferred_shifts));
    formData.set("weekly_available_hours", draft.weekly_available_hours);
    formData.set("job_status", draft.job_status);
    formData.set(
      "has_transportation",
      draft.has_transportation ? "true" : "false"
    );
    formData.set("id_document_type", draft.id_document_type);
    formData.set("upload_session_id", draft.upload_session_id);
    formData.set("documents", JSON.stringify(draft.documents));
    formData.set("consent_terms", draft.consent_terms ? "true" : "false");
    formData.set("consent_privacy", draft.consent_privacy ? "true" : "false");
    formData.set("guardian_name", draft.guardian_name);
    formData.set("guardian_phone", draft.guardian_phone);
    if (mode === "guest-public" && inviteToken) {
      formData.set("token", inviteToken);
    }
    if (mode === "guest-staff" && guestId) {
      formData.set("guest_id", guestId);
    }
    if (requireTurnstile) {
      formData.set(TURNSTILE_TOKEN_FIELD, turnstileToken);
    }

    startTransition(() => {
      formAction(formData);
    });
  }

  if (state.success) {
    if (mode === "guest-public") {
      return (
        <div className="flex min-h-[60vh] items-center">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>{t("registration.guestSuccessTitle")}</CardTitle>
              <CardDescription>
                {t("registration.guestSuccessBody")}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }

    const isGuestStaff = mode === "guest-staff";
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {isGuestStaff
              ? "Registration submitted"
              : t("registration.successTitle")}
          </CardTitle>
          <CardDescription>
            {isGuestStaff
              ? "The guest registration dossier was saved. This invite link can no longer be used."
              : t("registration.successBody")}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {!hidePageHeader ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("registration.title")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("registration.lead")}
            </p>
          </div>
          {mode === "guest-public" ? (
            <LanguageToggle className="self-start" />
          ) : null}
        </div>
      ) : null}

      <ol className="flex flex-wrap gap-2" aria-label={t("registration.stepsLabel")}>
        {REGISTRATION_STEPS.map((key, index) => {
          const isCurrent = index === stepIndex;
          const isDone = index < stepIndex;
          return (
            <li
              key={key}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                isCurrent
                  ? "bg-primary text-primary-foreground"
                  : isDone
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {isDone ? <CheckIcon className="size-3" /> : null}
              {index + 1}. {REGISTRATION_STEP_LABELS[key as RegistrationStep]}
            </li>
          );
        })}
      </ol>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {REGISTRATION_STEP_LABELS[step]}
          </CardTitle>
          <CardDescription>
            {t(`registration.step.${step}.hint` as "registration.step.personal.hint")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "personal" ? (
            <>
              <div>
                <RegLabel htmlFor="reg-full-name" required>
                  {t("registration.field.fullName")}
                </RegLabel>
                <Input
                  id="reg-full-name"
                  value={draft.full_name}
                  disabled={isPending}
                  onChange={(e) => patchDraft({ full_name: e.target.value })}
                />
                <FieldError message={stepErrors.full_name} />
              </div>
              <div>
                <RegLabel required>{t("registration.field.gender")}</RegLabel>
                <Select
                  value={draft.gender || null}
                  onValueChange={(value) =>
                    patchDraft({ gender: value ?? "" })
                  }
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("registration.selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {REGISTRATION_GENDER_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {REGISTRATION_GENDER_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={stepErrors.gender} />
              </div>
              <div>
                <RegLabel htmlFor="reg-dob" required>
                  {t("registration.field.dob")}
                </RegLabel>
                <Input
                  id="reg-dob"
                  type="date"
                  value={draft.date_of_birth}
                  disabled={isPending}
                  onChange={(e) =>
                    patchDraft({ date_of_birth: e.target.value })
                  }
                />
                {ageHint != null ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Age on file: {ageHint}
                  </p>
                ) : null}
                <FieldError message={stepErrors.date_of_birth} />
              </div>
              <div>
                <RegLabel required>
                  {t("registration.field.bloodType")}
                </RegLabel>
                <Select
                  value={draft.blood_type || null}
                  onValueChange={(value) =>
                    patchDraft({ blood_type: value ?? "" })
                  }
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("registration.selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {REGISTRATION_BLOOD_TYPE_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {REGISTRATION_BLOOD_TYPE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={stepErrors.blood_type} />
              </div>
            </>
          ) : null}

          {step === "contact" ? (
            <>
              <div>
                <RegLabel htmlFor="reg-email" required>
                  {t("registration.field.email")}
                </RegLabel>
                <Input
                  id="reg-email"
                  type="email"
                  value={draft.email}
                  disabled={isPending}
                  onChange={(e) => patchDraft({ email: e.target.value })}
                />
                <FieldError message={stepErrors.email} />
              </div>
              <div>
                <RegLabel htmlFor="reg-phone" required>
                  {t("registration.field.phone")}
                </RegLabel>
                <Input
                  id="reg-phone"
                  value={draft.phone}
                  disabled={isPending}
                  onChange={(e) => patchDraft({ phone: e.target.value })}
                />
                <FieldError message={stepErrors.phone} />
              </div>
              <div>
                <RegLabel htmlFor="reg-additional-phone">
                  {t("registration.field.additionalPhone")}
                </RegLabel>
                <Input
                  id="reg-additional-phone"
                  value={draft.additional_phone}
                  disabled={isPending}
                  onChange={(e) =>
                    patchDraft({ additional_phone: e.target.value })
                  }
                />
                <FieldError message={stepErrors.additional_phone} />
              </div>
              <div>
                <RegLabel htmlFor="reg-city" required>
                  {t("registration.field.city")}
                </RegLabel>
                <Input
                  id="reg-city"
                  value={draft.city}
                  disabled={isPending}
                  onChange={(e) => patchDraft({ city: e.target.value })}
                />
                <FieldError message={stepErrors.city} />
              </div>
              <div>
                <RegLabel htmlFor="reg-address" required>
                  {t("registration.field.address")}
                </RegLabel>
                <Input
                  id="reg-address"
                  value={draft.full_address}
                  disabled={isPending}
                  onChange={(e) =>
                    patchDraft({ full_address: e.target.value })
                  }
                />
                <FieldError message={stepErrors.full_address} />
              </div>
            </>
          ) : null}

          {step === "education" ? (
            <>
              <div>
                <RegLabel required>
                  {t("registration.field.educationLevel")}
                </RegLabel>
                <Select
                  value={draft.education_level || null}
                  onValueChange={(value) =>
                    patchDraft({ education_level: value ?? "" })
                  }
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("registration.selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {REGISTRATION_EDUCATION_LEVEL_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {REGISTRATION_EDUCATION_LEVEL_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={stepErrors.education_level} />
              </div>
              <div>
                <RegLabel htmlFor="reg-org">
                  {t("registration.field.organization")}
                </RegLabel>
                <Input
                  id="reg-org"
                  value={draft.organization_name}
                  disabled={isPending}
                  onChange={(e) =>
                    patchDraft({ organization_name: e.target.value })
                  }
                />
                <FieldError message={stepErrors.organization_name} />
              </div>
              <div>
                <RegLabel htmlFor="reg-speciality">
                  {t("registration.field.speciality")}
                </RegLabel>
                <Input
                  id="reg-speciality"
                  value={draft.speciality}
                  disabled={isPending}
                  onChange={(e) => patchDraft({ speciality: e.target.value })}
                />
                <FieldError message={stepErrors.speciality} />
              </div>
              <div>
                <RegLabel required>
                  {t("registration.field.learningStatus")}
                </RegLabel>
                <Select
                  value={draft.learning_status || null}
                  onValueChange={(value) =>
                    patchDraft({ learning_status: value ?? "" })
                  }
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("registration.selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {REGISTRATION_LEARNING_STATUS_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {REGISTRATION_LEARNING_STATUS_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={stepErrors.learning_status} />
              </div>
              {needsGraduationYear ? (
                <div>
                  <RegLabel htmlFor="reg-grad-year" required>
                    {t("registration.field.graduationYear")}
                  </RegLabel>
                  <Input
                    id="reg-grad-year"
                    type="number"
                    value={draft.graduation_year}
                    disabled={isPending}
                    onChange={(e) =>
                      patchDraft({ graduation_year: e.target.value })
                    }
                  />
                  <FieldError message={stepErrors.graduation_year} />
                </div>
              ) : null}
              <div>
                <RegLabel htmlFor="reg-self-learning">
                  {t("registration.field.selfLearning")}
                </RegLabel>
                <textarea
                  id="reg-self-learning"
                  value={draft.self_learning_notes}
                  disabled={isPending}
                  rows={3}
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  onChange={(e) =>
                    patchDraft({ self_learning_notes: e.target.value })
                  }
                />
                <FieldError message={stepErrors.self_learning_notes} />
              </div>
              <div>
                <RegLabel htmlFor="reg-goal" required>
                  {t("registration.field.learningGoal")}
                </RegLabel>
                <textarea
                  id="reg-goal"
                  value={draft.learning_goal}
                  disabled={isPending}
                  rows={3}
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  onChange={(e) =>
                    patchDraft({ learning_goal: e.target.value })
                  }
                />
                <FieldError message={stepErrors.learning_goal} />
              </div>
            </>
          ) : null}

          {step === "skills" ? (
            <>
              <div>
                <RegLabel required>{t("registration.field.skills")}</RegLabel>
                <ChipGroup
                  options={REGISTRATION_SKILL_VALUES}
                  labels={REGISTRATION_SKILL_LABELS}
                  selected={draft.skills}
                  disabled={isPending}
                  onToggle={(value) => {
                    const next = toggleInArray(draft.skills, value);
                    patchDraft({
                      skills: next,
                      skills_other: next.includes(REGISTRATION_SKILLS.OTHER)
                        ? draft.skills_other
                        : "",
                    });
                  }}
                />
                <FieldError message={stepErrors.skills} />
              </div>
              {draft.skills.includes(REGISTRATION_SKILLS.OTHER) ? (
                <div>
                  <RegLabel htmlFor="reg-skills-other" required>
                    {t("registration.field.skillsOther")}
                  </RegLabel>
                  <Input
                    id="reg-skills-other"
                    value={draft.skills_other}
                    disabled={isPending}
                    onChange={(e) =>
                      patchDraft({ skills_other: e.target.value })
                    }
                  />
                  <FieldError message={stepErrors.skills_other} />
                </div>
              ) : null}
              <div>
                <RegLabel required>
                  {t("registration.field.referral")}
                </RegLabel>
                <Select
                  value={draft.referral_source || null}
                  onValueChange={(value) =>
                    patchDraft({ referral_source: value ?? "" })
                  }
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("registration.selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {REGISTRATION_REFERRAL_SOURCE_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {REGISTRATION_REFERRAL_SOURCE_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={stepErrors.referral_source} />
              </div>
              {draft.referral_source === REGISTRATION_REFERRAL_SOURCES.OTHER ? (
                <div>
                  <RegLabel htmlFor="reg-referral-other" required>
                    {t("registration.field.referralOther")}
                  </RegLabel>
                  <Input
                    id="reg-referral-other"
                    value={draft.referral_other}
                    disabled={isPending}
                    onChange={(e) =>
                      patchDraft({ referral_other: e.target.value })
                    }
                  />
                  <FieldError message={stepErrors.referral_other} />
                </div>
              ) : null}
              <div>
                <RegLabel required>
                  {t("registration.field.program")}
                </RegLabel>
                <Select
                  value={draft.preferred_program || null}
                  onValueChange={(value) =>
                    patchDraft({ preferred_program: value ?? "" })
                  }
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("registration.selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {REGISTRATION_PREFERRED_PROGRAM_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {REGISTRATION_PREFERRED_PROGRAM_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={stepErrors.preferred_program} />
              </div>
            </>
          ) : null}

          {step === "availability" ? (
            <>
              <div>
                <RegLabel required>{t("registration.field.days")}</RegLabel>
                <ChipGroup
                  options={REGISTRATION_WEEKDAY_VALUES}
                  labels={REGISTRATION_WEEKDAY_LABELS}
                  selected={draft.available_days}
                  disabled={isPending}
                  onToggle={(value) =>
                    patchDraft({
                      available_days: toggleInArray(draft.available_days, value),
                    })
                  }
                />
                <FieldError message={stepErrors.available_days} />
              </div>
              <div>
                <RegLabel required>
                  {t("registration.field.shifts")}
                </RegLabel>
                <ChipGroup
                  options={REGISTRATION_SHIFT_VALUES}
                  labels={REGISTRATION_SHIFT_LABELS}
                  selected={draft.preferred_shifts}
                  disabled={isPending}
                  onToggle={(value) =>
                    patchDraft({
                      preferred_shifts: toggleInArray(
                        draft.preferred_shifts,
                        value
                      ),
                    })
                  }
                />
                <FieldError message={stepErrors.preferred_shifts} />
              </div>
              <div>
                <RegLabel htmlFor="reg-hours" required>
                  {t("registration.field.hours")}
                </RegLabel>
                <Input
                  id="reg-hours"
                  type="number"
                  min={1}
                  max={60}
                  value={draft.weekly_available_hours}
                  disabled={isPending}
                  onChange={(e) =>
                    patchDraft({ weekly_available_hours: e.target.value })
                  }
                />
                <FieldError message={stepErrors.weekly_available_hours} />
              </div>
              <div>
                <RegLabel required>
                  {t("registration.field.jobStatus")}
                </RegLabel>
                <Select
                  value={draft.job_status || null}
                  onValueChange={(value) =>
                    patchDraft({ job_status: value ?? "" })
                  }
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("registration.selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {REGISTRATION_JOB_STATUS_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {REGISTRATION_JOB_STATUS_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={stepErrors.job_status} />
              </div>
              <div>
                <RegLabel required>
                  {t("registration.field.transportation")}
                </RegLabel>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={
                      draft.has_transportation === true ? "default" : "outline"
                    }
                    disabled={isPending}
                    onClick={() => patchDraft({ has_transportation: true })}
                  >
                    {t("registration.yes")}
                  </Button>
                  <Button
                    type="button"
                    variant={
                      draft.has_transportation === false ? "default" : "outline"
                    }
                    disabled={isPending}
                    onClick={() => patchDraft({ has_transportation: false })}
                  >
                    {t("registration.no")}
                  </Button>
                </div>
                <FieldError message={stepErrors.has_transportation} />
              </div>
            </>
          ) : null}

          {step === "documents" ? (
            <RegistrationDocumentsStep
              uploadSessionId={draft.upload_session_id}
              idDocumentType={draft.id_document_type}
              documents={draft.documents}
              disabled={isSubmitPending}
              uploadAction={documentUploadAction}
              removeAction={documentRemoveAction}
              onBusyChange={setIsDocumentBusy}
              errors={{
                id_document_type: stepErrors.id_document_type,
                documents: stepErrors.documents,
              }}
              onIdDocumentTypeChange={(value) =>
                patchDraft({ id_document_type: value })
              }
              onDocumentsChange={(documents) => patchDraft({ documents })}
              onAppendDocuments={(uploaded) =>
                setDraft((current) => ({
                  ...current,
                  documents: [...current.documents, ...uploaded].slice(
                    0,
                    REGISTRATION_DOCUMENT_MAX_FILES
                  ),
                }))
              }
              RegLabel={RegLabel}
              FieldError={FieldError}
            />
          ) : null}

          {step === "review" ? (
            <div className="space-y-4 text-sm">
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">
                    {t("registration.field.fullName")}
                  </dt>
                  <dd>{draft.full_name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {t("registration.field.email")}
                  </dt>
                  <dd>{draft.email}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {t("registration.field.phone")}
                  </dt>
                  <dd>{draft.phone}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {t("registration.field.program")}
                  </dt>
                  <dd>
                    {REGISTRATION_PREFERRED_PROGRAM_LABELS[
                      draft.preferred_program as keyof typeof REGISTRATION_PREFERRED_PROGRAM_LABELS
                    ] ?? draft.preferred_program}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {t("registration.field.idDocumentType")}
                  </dt>
                  <dd>
                    {REGISTRATION_ID_DOCUMENT_TYPE_LABELS[
                      draft.id_document_type as keyof typeof REGISTRATION_ID_DOCUMENT_TYPE_LABELS
                    ] ?? draft.id_document_type}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">
                    {t("registration.field.documents")}
                  </dt>
                  <dd>
                    {draft.documents.map((doc) => doc.file_name).join(", ")}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">
                    {t("registration.field.skills")}
                  </dt>
                  <dd>
                    {draft.skills
                      .map((skill) => {
                        const label =
                          REGISTRATION_SKILL_LABELS[
                            skill as keyof typeof REGISTRATION_SKILL_LABELS
                          ] ?? skill;
                        if (
                          skill === REGISTRATION_SKILLS.OTHER &&
                          draft.skills_other.trim()
                        ) {
                          return `${label}: ${draft.skills_other.trim()}`;
                        }
                        return label;
                      })
                      .join(", ")}
                  </dd>
                </div>
              </dl>

              {showGuardian ? (
                <div className="space-y-3 rounded-lg border p-3">
                  <p className="font-medium">
                    {t("registration.guardianTitle")}
                  </p>
                  <div>
                    <RegLabel htmlFor="reg-guardian-name" required>
                      {t("registration.field.guardianName")}
                    </RegLabel>
                    <Input
                      id="reg-guardian-name"
                      value={draft.guardian_name}
                      disabled={isPending}
                      onChange={(e) =>
                        patchDraft({ guardian_name: e.target.value })
                      }
                    />
                    <FieldError message={stepErrors.guardian_name} />
                  </div>
                  <div>
                    <RegLabel htmlFor="reg-guardian-phone" required>
                      {t("registration.field.guardianPhone")}
                    </RegLabel>
                    <Input
                      id="reg-guardian-phone"
                      value={draft.guardian_phone}
                      disabled={isPending}
                      onChange={(e) =>
                        patchDraft({ guardian_phone: e.target.value })
                      }
                    />
                    <FieldError message={stepErrors.guardian_phone} />
                  </div>
                </div>
              ) : null}

              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={draft.consent_terms}
                  disabled={isPending}
                  onChange={(e) =>
                    patchDraft({ consent_terms: e.target.checked })
                  }
                />
                <span>{t("registration.field.consentTerms")}</span>
              </label>
              <FieldError message={stepErrors.consent_terms} />
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={draft.consent_privacy}
                  disabled={isPending}
                  onChange={(e) =>
                    patchDraft({ consent_privacy: e.target.checked })
                  }
                />
                <span>{t("registration.field.consentPrivacy")}</span>
              </label>
              <FieldError message={stepErrors.consent_privacy} />

              {requireTurnstile ? (
                <div className="space-y-1">
                  {turnstileSiteKey ? (
                    <TurnstileWidget
                      ref={turnstileRef}
                      siteKey={turnstileSiteKey}
                      action={TURNSTILE_REGISTER_ACTION}
                      onTokenChange={(token) => {
                        setTurnstileToken(token);
                        if (token) {
                          setStepErrors((current) => {
                            if (!current.turnstile) return current;
                            const next = { ...current };
                            delete next.turnstile;
                            return next;
                          });
                        }
                      }}
                    />
                  ) : (
                    <p className="text-sm text-destructive">
                      {t("registration.turnstile.unavailable")}
                    </p>
                  )}
                  <FieldError message={stepErrors.turnstile} />
                </div>
              ) : null}

              {state.error && !state.fieldErrors ? (
                <p className="text-sm text-destructive">{state.error}</p>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending || stepIndex === 0}
              onClick={handleBack}
            >
              {t("registration.back")}
            </Button>
            {step === "review" ? (
              <Button
                type="button"
                disabled={
                  isPending ||
                  (requireTurnstile && (!turnstileToken || !turnstileSiteKey))
                }
                onClick={handleSubmit}
              >
                {isPending ? <InlineSpinner className="mr-2" /> : null}
                {t("registration.submit")}
              </Button>
            ) : (
              <Button type="button" disabled={isPending} onClick={handleNext}>
                {t("registration.next")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
