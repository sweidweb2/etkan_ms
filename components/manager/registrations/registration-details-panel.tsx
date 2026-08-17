"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ExternalLinkIcon } from "lucide-react";
import { updateRegistrationApplicationAction } from "@/app/(panels)/manager/registrations/actions";
import { usePermissions } from "@/components/auth/permissions-provider";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  REGISTRATION_APPLICATION_STATUS_LABELS,
  REGISTRATION_APPLICATION_STATUS_VALUES,
  REGISTRATION_BLOOD_TYPE_LABELS,
  REGISTRATION_BLOOD_TYPE_VALUES,
  REGISTRATION_EDUCATION_LEVEL_LABELS,
  REGISTRATION_EDUCATION_LEVEL_VALUES,
  REGISTRATION_GENDER_LABELS,
  REGISTRATION_GENDER_VALUES,
  REGISTRATION_ID_DOCUMENT_TYPE_LABELS,
  REGISTRATION_ID_DOCUMENT_TYPE_VALUES,
  REGISTRATION_JOB_STATUS_LABELS,
  REGISTRATION_JOB_STATUS_VALUES,
  REGISTRATION_LEARNING_STATUS_LABELS,
  REGISTRATION_LEARNING_STATUS_VALUES,
  REGISTRATION_LEARNING_STATUSES,
  REGISTRATION_LIMITS,
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
  REGISTRATION_WEEKDAY_LABELS,
  REGISTRATION_WEEKDAY_VALUES,
  type RegistrationApplicationStatus,
} from "@/lib/constants/public-registration";
import { getManagerGuestDetailRoute, ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type {
  ManagerRegistrationApplicationRow,
  ManagerRegistrationDocumentSignedRow,
  UpdateRegistrationStatusActionState,
} from "@/types/public-registration";

const initialActionState: UpdateRegistrationStatusActionState = {};

const textareaClassName = cn(
  "flex min-h-[88px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs",
  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

type EditDraft = {
  status: RegistrationApplicationStatus;
  notes: string;
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
  has_transportation: boolean;
  id_document_type: string;
  guardian_name: string;
  guardian_phone: string;
};

type RegistrationDetailsPanelProps = {
  application: ManagerRegistrationApplicationRow;
  signedDocuments: ManagerRegistrationDocumentSignedRow[];
};

function draftFromApplication(
  application: ManagerRegistrationApplicationRow
): EditDraft {
  return {
    status: application.status,
    notes: application.notes ?? "",
    full_name: application.full_name,
    gender: application.gender,
    date_of_birth: application.date_of_birth,
    blood_type: application.blood_type,
    email: application.email,
    phone: application.phone,
    additional_phone: application.additional_phone ?? "",
    city: application.city,
    full_address: application.full_address,
    education_level: application.education_level,
    organization_name: application.organization_name ?? "",
    speciality: application.speciality ?? "",
    learning_status: application.learning_status,
    graduation_year:
      application.graduation_year != null
        ? String(application.graduation_year)
        : "",
    self_learning_notes: application.self_learning_notes ?? "",
    learning_goal: application.learning_goal,
    skills: [...application.skills],
    referral_source: application.referral_source,
    referral_other: application.referral_other ?? "",
    skills_other: application.skills_other ?? "",
    preferred_program: application.preferred_program,
    available_days: [...application.available_days],
    preferred_shifts: [...application.preferred_shifts],
    weekly_available_hours: String(application.weekly_available_hours),
    job_status: application.job_status,
    has_transportation: application.has_transportation,
    id_document_type: application.id_document_type,
    guardian_name: application.guardian_name ?? "",
    guardian_phone: application.guardian_phone ?? "",
  };
}

function normalizeDraft(draft: EditDraft): string {
  return JSON.stringify({
    ...draft,
    skills: [...draft.skills].sort(),
    available_days: [...draft.available_days].sort(),
    preferred_shifts: [...draft.preferred_shifts].sort(),
    notes: draft.notes.trim(),
    additional_phone: draft.additional_phone.trim(),
    organization_name: draft.organization_name.trim(),
    speciality: draft.speciality.trim(),
    self_learning_notes: draft.self_learning_notes.trim(),
    referral_other: draft.referral_other.trim(),
    skills_other: draft.skills_other.trim(),
    guardian_name: draft.guardian_name.trim(),
    guardian_phone: draft.guardian_phone.trim(),
    graduation_year: draft.graduation_year.trim(),
  });
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-destructive">{message}</p>;
}

function FieldShell({
  label,
  htmlFor,
  className,
  children,
  error,
}: {
  label: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className="border-b bg-muted/30 px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {children}
      </div>
    </section>
  );
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
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-muted",
              disabled && "pointer-events-none opacity-50"
            )}
          >
            {labels[value] ?? value}
          </button>
        );
      })}
    </div>
  );
}

function toggleInArray(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

export function RegistrationDetailsPanel({
  application,
  signedDocuments,
}: RegistrationDetailsPanelProps) {
  const router = useRouter();
  const permissions = usePermissions();
  const canEdit = hasPermissionInSet(
    permissions,
    PERMISSIONS.REGISTRATIONS_UPDATE_STATUS
  );
  const [draft, setDraft] = useState(() => draftFromApplication(application));
  const [baseline, setBaseline] = useState(() =>
    normalizeDraft(draftFromApplication(application))
  );
  const [prevApplication, setPrevApplication] =
    useState(application);
  const [state, formAction, isActionPending] = useActionState(
    updateRegistrationApplicationAction,
    initialActionState
  );
  const [isTransitionPending, startTransition] = useTransition();

  if (application !== prevApplication) {
    setPrevApplication(application);
    const next = draftFromApplication(application);
    setDraft(next);
    setBaseline(normalizeDraft(next));
  }

  const isPending = isActionPending || isTransitionPending;
  const isDirty = normalizeDraft(draft) !== baseline;
  const fieldErrors = state.fieldErrors ?? {};
  const needsGraduationYear =
    draft.learning_status === REGISTRATION_LEARNING_STATUSES.GRADUATED ||
    draft.learning_status === REGISTRATION_LEARNING_STATUSES.STOPPED;
  const showReferralOther =
    draft.referral_source === REGISTRATION_REFERRAL_SOURCES.OTHER;
  const showSkillsOther = draft.skills.includes(REGISTRATION_SKILLS.OTHER);

  useActionStateToast(state, isPending);
  useActionStateSuccess(state, isPending, () => {
    setBaseline(normalizeDraft(draft));
    router.refresh();
  });

  function patchDraft(partial: Partial<EditDraft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  function handleSave() {
    if (!canEdit || !isDirty) return;
    const formData = new FormData();
    formData.set("id", application.id);
    formData.set("status", draft.status);
    formData.set("notes", draft.notes);
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
    formData.set("guardian_name", draft.guardian_name);
    formData.set("guardian_phone", draft.guardian_phone);
    startTransition(() => {
      formAction(formData);
    });
  }

  function handleReset() {
    setDraft(draftFromApplication(application));
  }

  const readOnly = !canEdit || isPending;
  const statusLabel = useMemo(
    () => REGISTRATION_APPLICATION_STATUS_LABELS[application.status],
    [application.status]
  );

  return (
    <div className="flex flex-col gap-6 pb-28">
      <Breadcrumb className="min-w-0">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_REGISTRATIONS}>
              Registrations
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{application.full_name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {draft.full_name || application.full_name}
            </h1>
            {application.guest_id ? (
              <Link
                href={getManagerGuestDetailRoute(application.guest_id)}
                className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              >
                Guest
              </Link>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted{" "}
            {format(new Date(application.created_at), "MMM d, yyyy · HH:mm")}
            {" · "}
            {statusLabel}
          </p>
        </div>
        {isDirty && canEdit ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Unsaved changes
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
      <SectionCard title="Status & notes" description="Manager review fields.">
        <FieldShell
          label="Status"
          htmlFor="reg-status"
          error={fieldErrors.status?.[0]}
        >
          <Select
            value={draft.status}
            onValueChange={(value) => {
              if (
                value &&
                (
                  REGISTRATION_APPLICATION_STATUS_VALUES as readonly string[]
                ).includes(value)
              ) {
                patchDraft({
                  status: value as RegistrationApplicationStatus,
                });
              }
            }}
            disabled={readOnly}
          >
            <SelectTrigger id="reg-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGISTRATION_APPLICATION_STATUS_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {REGISTRATION_APPLICATION_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>
        <FieldShell
          label="Manager notes"
          htmlFor="reg-notes"
          className="sm:col-span-2"
          error={fieldErrors.notes?.[0]}
        >
          <textarea
            id="reg-notes"
            rows={3}
            maxLength={REGISTRATION_LIMITS.managerNotes.max}
            value={draft.notes}
            disabled={readOnly}
            className={textareaClassName}
            onChange={(e) => patchDraft({ notes: e.target.value })}
            placeholder="Internal notes for this application…"
          />
        </FieldShell>
      </SectionCard>

      <SectionCard title="Personal">
        <FieldShell
          label="Full name"
          htmlFor="reg-full-name"
          error={fieldErrors.full_name?.[0]}
        >
          <Input
            id="reg-full-name"
            value={draft.full_name}
            disabled={readOnly}
            onChange={(e) => patchDraft({ full_name: e.target.value })}
          />
        </FieldShell>
        <FieldShell
          label="Gender"
          htmlFor="reg-gender"
          error={fieldErrors.gender?.[0]}
        >
          <Select
            value={draft.gender || null}
            onValueChange={(value) => patchDraft({ gender: value ?? "" })}
            disabled={readOnly}
          >
            <SelectTrigger id="reg-gender" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGISTRATION_GENDER_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {REGISTRATION_GENDER_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>
        <FieldShell
          label="Date of birth"
          htmlFor="reg-dob"
          error={fieldErrors.date_of_birth?.[0]}
        >
          <Input
            id="reg-dob"
            type="date"
            value={draft.date_of_birth}
            disabled={readOnly}
            onChange={(e) => patchDraft({ date_of_birth: e.target.value })}
          />
        </FieldShell>
        <FieldShell
          label="Blood type"
          htmlFor="reg-blood"
          error={fieldErrors.blood_type?.[0]}
        >
          <Select
            value={draft.blood_type || null}
            onValueChange={(value) => patchDraft({ blood_type: value ?? "" })}
            disabled={readOnly}
          >
            <SelectTrigger id="reg-blood" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGISTRATION_BLOOD_TYPE_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {REGISTRATION_BLOOD_TYPE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>
      </SectionCard>

      <SectionCard title="Contact">
        <FieldShell
          label="Email"
          htmlFor="reg-email"
          error={fieldErrors.email?.[0]}
        >
          <Input
            id="reg-email"
            type="email"
            value={draft.email}
            disabled={readOnly}
            onChange={(e) => patchDraft({ email: e.target.value })}
          />
        </FieldShell>
        <FieldShell
          label="Phone"
          htmlFor="reg-phone"
          error={fieldErrors.phone?.[0]}
        >
          <Input
            id="reg-phone"
            value={draft.phone}
            disabled={readOnly}
            onChange={(e) => patchDraft({ phone: e.target.value })}
          />
        </FieldShell>
        <FieldShell
          label="Additional phone"
          htmlFor="reg-additional-phone"
          error={fieldErrors.additional_phone?.[0]}
        >
          <Input
            id="reg-additional-phone"
            value={draft.additional_phone}
            disabled={readOnly}
            onChange={(e) => patchDraft({ additional_phone: e.target.value })}
          />
        </FieldShell>
        <FieldShell
          label="City / region"
          htmlFor="reg-city"
          error={fieldErrors.city?.[0]}
        >
          <Input
            id="reg-city"
            value={draft.city}
            disabled={readOnly}
            onChange={(e) => patchDraft({ city: e.target.value })}
          />
        </FieldShell>
        <FieldShell
          label="Full address"
          htmlFor="reg-address"
          className="sm:col-span-2"
          error={fieldErrors.full_address?.[0]}
        >
          <textarea
            id="reg-address"
            rows={2}
            value={draft.full_address}
            disabled={readOnly}
            className={textareaClassName}
            onChange={(e) => patchDraft({ full_address: e.target.value })}
          />
        </FieldShell>
      </SectionCard>

      <SectionCard title="Education">
        <FieldShell
          label="Education level"
          error={fieldErrors.education_level?.[0]}
        >
          <Select
            value={draft.education_level || null}
            onValueChange={(value) =>
              patchDraft({ education_level: value ?? "" })
            }
            disabled={readOnly}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGISTRATION_EDUCATION_LEVEL_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {REGISTRATION_EDUCATION_LEVEL_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>
        <FieldShell
          label="Learning status"
          error={fieldErrors.learning_status?.[0]}
        >
          <Select
            value={draft.learning_status || null}
            onValueChange={(value) =>
              patchDraft({ learning_status: value ?? "" })
            }
            disabled={readOnly}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGISTRATION_LEARNING_STATUS_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {REGISTRATION_LEARNING_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>
        <FieldShell
          label="Organization"
          htmlFor="reg-org"
          error={fieldErrors.organization_name?.[0]}
        >
          <Input
            id="reg-org"
            value={draft.organization_name}
            disabled={readOnly}
            onChange={(e) => patchDraft({ organization_name: e.target.value })}
          />
        </FieldShell>
        <FieldShell
          label="Speciality"
          htmlFor="reg-speciality"
          error={fieldErrors.speciality?.[0]}
        >
          <Input
            id="reg-speciality"
            value={draft.speciality}
            disabled={readOnly}
            onChange={(e) => patchDraft({ speciality: e.target.value })}
          />
        </FieldShell>
        {needsGraduationYear ? (
          <FieldShell
            label="Graduation year"
            htmlFor="reg-grad-year"
            error={fieldErrors.graduation_year?.[0]}
          >
            <Input
              id="reg-grad-year"
              type="number"
              value={draft.graduation_year}
              disabled={readOnly}
              onChange={(e) => patchDraft({ graduation_year: e.target.value })}
            />
          </FieldShell>
        ) : null}
        <FieldShell
          label="Learning goal"
          htmlFor="reg-goal"
          className="sm:col-span-2"
          error={fieldErrors.learning_goal?.[0]}
        >
          <textarea
            id="reg-goal"
            rows={3}
            value={draft.learning_goal}
            disabled={readOnly}
            className={textareaClassName}
            onChange={(e) => patchDraft({ learning_goal: e.target.value })}
          />
        </FieldShell>
        <FieldShell
          label="Self-learning notes"
          htmlFor="reg-self-learning"
          className="sm:col-span-2"
          error={fieldErrors.self_learning_notes?.[0]}
        >
          <textarea
            id="reg-self-learning"
            rows={2}
            value={draft.self_learning_notes}
            disabled={readOnly}
            className={textareaClassName}
            onChange={(e) =>
              patchDraft({ self_learning_notes: e.target.value })
            }
          />
        </FieldShell>
      </SectionCard>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
      <SectionCard title="Skills & program">
        <FieldShell
          label="Skills"
          className="sm:col-span-2"
          error={fieldErrors.skills?.[0]}
        >
          <ChipGroup
            options={REGISTRATION_SKILL_VALUES}
            labels={REGISTRATION_SKILL_LABELS}
            selected={draft.skills}
            disabled={readOnly}
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
        </FieldShell>
        {showSkillsOther ? (
          <FieldShell
            label="Other skill"
            htmlFor="reg-skills-other"
            className="sm:col-span-2"
            error={fieldErrors.skills_other?.[0]}
          >
            <Input
              id="reg-skills-other"
              value={draft.skills_other}
              disabled={readOnly}
              onChange={(e) => patchDraft({ skills_other: e.target.value })}
            />
          </FieldShell>
        ) : null}
        <FieldShell
          label="Preferred program"
          error={fieldErrors.preferred_program?.[0]}
        >
          <Select
            value={draft.preferred_program || null}
            onValueChange={(value) =>
              patchDraft({ preferred_program: value ?? "" })
            }
            disabled={readOnly}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGISTRATION_PREFERRED_PROGRAM_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {REGISTRATION_PREFERRED_PROGRAM_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>
        <FieldShell
          label="Referral source"
          error={fieldErrors.referral_source?.[0]}
        >
          <Select
            value={draft.referral_source || null}
            onValueChange={(value) =>
              patchDraft({ referral_source: value ?? "" })
            }
            disabled={readOnly}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGISTRATION_REFERRAL_SOURCE_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {REGISTRATION_REFERRAL_SOURCE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>
        {showReferralOther ? (
          <FieldShell
            label="Referral details"
            htmlFor="reg-referral-other"
            className="sm:col-span-2"
            error={fieldErrors.referral_other?.[0]}
          >
            <Input
              id="reg-referral-other"
              value={draft.referral_other}
              disabled={readOnly}
              onChange={(e) => patchDraft({ referral_other: e.target.value })}
            />
          </FieldShell>
        ) : null}
      </SectionCard>

      <SectionCard title="Availability">
        <FieldShell
          label="Days available"
          className="sm:col-span-2"
          error={fieldErrors.available_days?.[0]}
        >
          <ChipGroup
            options={REGISTRATION_WEEKDAY_VALUES}
            labels={REGISTRATION_WEEKDAY_LABELS}
            selected={draft.available_days}
            disabled={readOnly}
            onToggle={(value) =>
              patchDraft({
                available_days: toggleInArray(draft.available_days, value),
              })
            }
          />
        </FieldShell>
        <FieldShell
          label="Preferred shifts"
          className="sm:col-span-2"
          error={fieldErrors.preferred_shifts?.[0]}
        >
          <ChipGroup
            options={REGISTRATION_SHIFT_VALUES}
            labels={REGISTRATION_SHIFT_LABELS}
            selected={draft.preferred_shifts}
            disabled={readOnly}
            onToggle={(value) =>
              patchDraft({
                preferred_shifts: toggleInArray(draft.preferred_shifts, value),
              })
            }
          />
        </FieldShell>
        <FieldShell
          label="Hours / week"
          htmlFor="reg-hours"
          error={fieldErrors.weekly_available_hours?.[0]}
        >
          <Input
            id="reg-hours"
            type="number"
            min={REGISTRATION_LIMITS.weeklyHours.min}
            max={REGISTRATION_LIMITS.weeklyHours.max}
            value={draft.weekly_available_hours}
            disabled={readOnly}
            onChange={(e) =>
              patchDraft({ weekly_available_hours: e.target.value })
            }
          />
        </FieldShell>
        <FieldShell label="Job status" error={fieldErrors.job_status?.[0]}>
          <Select
            value={draft.job_status || null}
            onValueChange={(value) => patchDraft({ job_status: value ?? "" })}
            disabled={readOnly}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGISTRATION_JOB_STATUS_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {REGISTRATION_JOB_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>
        <FieldShell
          label="Transportation"
          error={fieldErrors.has_transportation?.[0]}
        >
          <div className="flex gap-2">
            <Button
              type="button"
              variant={draft.has_transportation ? "default" : "outline"}
              disabled={readOnly}
              onClick={() => patchDraft({ has_transportation: true })}
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={!draft.has_transportation ? "default" : "outline"}
              disabled={readOnly}
              onClick={() => patchDraft({ has_transportation: false })}
            >
              No
            </Button>
          </div>
        </FieldShell>
      </SectionCard>

      <SectionCard title="Identity documents">
        <FieldShell
          label="ID document type"
          error={fieldErrors.id_document_type?.[0]}
        >
          <Select
            value={draft.id_document_type || null}
            onValueChange={(value) =>
              patchDraft({ id_document_type: value ?? "" })
            }
            disabled={readOnly}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGISTRATION_ID_DOCUMENT_TYPE_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {REGISTRATION_ID_DOCUMENT_TYPE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>
        <div className="sm:col-span-2">
          <Label>Uploaded files</Label>
          <div className="mt-2 space-y-2">
            {signedDocuments.length > 0 ? (
              signedDocuments.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                >
                  <span className="min-w-0 truncate font-medium">
                    {doc.file_name}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-primary">
                    Open
                    <ExternalLinkIcon className="size-3.5" />
                  </span>
                </a>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No documents</p>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Guardian" description="Required when applicant is under 18.">
        <FieldShell
          label="Guardian name"
          htmlFor="reg-guardian-name"
          error={fieldErrors.guardian_name?.[0]}
        >
          <Input
            id="reg-guardian-name"
            value={draft.guardian_name}
            disabled={readOnly}
            onChange={(e) => patchDraft({ guardian_name: e.target.value })}
          />
        </FieldShell>
        <FieldShell
          label="Guardian phone"
          htmlFor="reg-guardian-phone"
          error={fieldErrors.guardian_phone?.[0]}
        >
          <Input
            id="reg-guardian-phone"
            value={draft.guardian_phone}
            disabled={readOnly}
            onChange={(e) => patchDraft({ guardian_phone: e.target.value })}
          />
        </FieldShell>
      </SectionCard>
      </div>
      </div>

      {state.error && !state.fieldErrors ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      {canEdit ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-4 md:p-6 md:ps-28">
          <div className="pointer-events-auto mx-auto flex w-full max-w-5xl flex-wrap items-center justify-end gap-2 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/85">
            <Button
              type="button"
              variant="outline"
              disabled={isPending || !isDirty}
              onClick={handleReset}
            >
              Discard
            </Button>
            <Button
              type="button"
              disabled={isPending || !isDirty}
              onClick={handleSave}
            >
              {isPending ? <InlineSpinner className="mr-2" /> : null}
              Save changes
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
