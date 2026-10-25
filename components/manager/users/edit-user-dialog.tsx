"use client";

import { useEffect } from "react";
import { updateUserAction } from "@/app/manager/users/actions";
import { FieldError } from "@/components/auth/field-error";
import { FieldLabel } from "@/components/auth/field-label";
import { PasswordInput } from "@/components/auth/password-input";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useMutationDialogForm } from "@/hooks/use-mutation-dialog-form";
import { useZodForm } from "@/hooks/use-zod-form";
import { AUTH_FIELD_HINTS } from "@/lib/constants/auth-field-hints";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import { MANAGER_STUDENT_STATUS_LABELS } from "@/lib/constants/manager-student-display";
import {
  STUDENT_STATUS_VALUES,
  STUDENT_STATUSES,
  type StudentStatusValue,
} from "@/lib/constants/manager-student-status";
import {
  MANAGER_USER_EDITABLE_ROLES,
  MANAGER_USER_ROLE_LABELS,
} from "@/lib/constants/manager-user-display";
import { ROLES } from "@/lib/constants/roles";
import { getLocalIsoDate } from "@/lib/utils/local-iso-date";
import {
  updateManagerUserSchema,
  type UpdateManagerUserInput,
} from "@/lib/validators/manager/update-user";
import type {
  ManagerUserRow,
  UpdateManagerUserActionState,
} from "@/types/manager-user";

const initialState: UpdateManagerUserActionState = {};

type EditUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ManagerUserRow;
  onUserUpdated: (user: ManagerUserRow) => void;
};

function getDefaultValues(user: ManagerUserRow): UpdateManagerUserInput {
  return {
    username: user.username ?? "",
    email: user.email,
    role: user.role,
    is_instructor: user.is_instructor,
    is_mentor: user.is_mentor,
    fullName: user.student_full_name ?? "",
    birthDate: user.student_birth_date ?? "",
    phone: user.student_phone ?? "",
    status: user.student_status ?? STUDENT_STATUSES.ACTIVE,
    password: "",
    confirmPassword: "",
  };
}

function buildUpdateFormData(
  userId: string,
  values: UpdateManagerUserInput
) {
  const formData = new FormData();
  formData.set("userId", userId);
  formData.set("username", values.username.trim());
  formData.set("email", values.email.trim());
  formData.set("role", values.role);
  formData.set("is_instructor", String(values.is_instructor));
  formData.set("is_mentor", String(values.is_mentor));
  formData.set("password", values.password ?? "");
  formData.set("confirmPassword", values.confirmPassword ?? "");

  if (values.role === ROLES.STUDENT) {
    formData.set("fullName", values.fullName?.trim() ?? "");
    formData.set("birthDate", values.birthDate?.trim() ?? "");
    formData.set("phone", values.phone?.trim() ?? "");
    formData.set("status", values.status ?? STUDENT_STATUSES.ACTIVE);
  }

  return formData;
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  onUserUpdated,
}: EditUserDialogProps) {
  const { state, formAction, isPending, handleOpenChange } =
    useMutationDialogForm({
      action: updateUserAction,
      initialState,
      open,
      onOpenChange,
      onSuccess: (nextState) => {
        if (nextState.user) {
          onUserUpdated(nextState.user);
        }
        onOpenChange(false);
      },
    });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useZodForm({
    schema: updateManagerUserSchema,
    mode: "onBlur",
    defaultValues: getDefaultValues(user),
  });

  const selectedRole = watch("role");
  const selectedStatus = watch("status");
  const isInstructor = watch("is_instructor");
  const isMentor = watch("is_mentor");
  const isStudentRole = selectedRole === ROLES.STUDENT;

  useEffect(() => {
    if (open) {
      reset(getDefaultValues(user));
    }
  }, [open, reset, user]);

  function onSubmit(values: UpdateManagerUserInput) {
    formAction(buildUpdateFormData(user.id, values));
  }

  const usernameError =
    errors.username?.message ?? state.fieldErrors?.username?.[0];
  const emailError = errors.email?.message ?? state.fieldErrors?.email?.[0];
  const passwordError =
    errors.password?.message ?? state.fieldErrors?.password?.[0];
  const confirmPasswordError =
    errors.confirmPassword?.message ?? state.fieldErrors?.confirmPassword?.[0];
  const roleError = errors.role?.message ?? state.fieldErrors?.role?.[0];
  const fullNameError =
    errors.fullName?.message ?? state.fieldErrors?.fullName?.[0];
  const birthDateError =
    errors.birthDate?.message ?? state.fieldErrors?.birthDate?.[0];
  const phoneError = errors.phone?.message ?? state.fieldErrors?.phone?.[0];
  const statusError =
    errors.status?.message ?? state.fieldErrors?.status?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[min(90vh,40rem)] flex-col gap-0 overflow-hidden sm:max-w-2xl"
        showCloseButton={!isPending}
      >
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update account details
            {isStudentRole ? " and student profile fields" : ""}.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-user-form"
          onSubmit={(event) => {
            void handleSubmit(onSubmit)(event);
          }}
          className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto py-4 sm:grid-cols-2"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-user-username"
              label="Username"
              hint={AUTH_FIELD_HINTS.username}
            />
            <Input
              id="edit-user-username"
              type="text"
              autoComplete="username"
              minLength={AUTH_LIMITS.username.min}
              maxLength={AUTH_LIMITS.username.max}
              aria-invalid={!!usernameError}
              disabled={isPending}
              {...register("username")}
            />
            {usernameError ? (
              <FieldError>{usernameError}</FieldError>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-user-email"
              label="Email"
              hint={AUTH_FIELD_HINTS.email}
            />
            <Input
              id="edit-user-email"
              type="email"
              autoComplete="email"
              minLength={AUTH_LIMITS.email.min}
              maxLength={AUTH_LIMITS.email.max}
              aria-invalid={!!emailError}
              disabled={isPending}
              {...register("email")}
            />
            {emailError ? (
              <FieldError>{emailError}</FieldError>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-user-password"
              label="New password"
              hint="Optional. Leave blank to keep the current password."
            />
            <PasswordInput
              id="edit-user-password"
              autoComplete="new-password"
              placeholder="Enter a new password"
              maxLength={AUTH_LIMITS.password.max}
              aria-invalid={!!passwordError}
              disabled={isPending}
              onGeneratePassword={(password) => {
                setValue("password", password, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                setValue("confirmPassword", password, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
              {...register("password")}
            />
            {passwordError ? (
              <FieldError>{passwordError}</FieldError>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-user-confirm-password"
              label="Confirm password"
              hint={AUTH_FIELD_HINTS.confirmPassword}
            />
            <PasswordInput
              id="edit-user-confirm-password"
              autoComplete="new-password"
              placeholder="Confirm the new password"
              maxLength={AUTH_LIMITS.password.max}
              aria-invalid={!!confirmPasswordError}
              disabled={isPending}
              {...register("confirmPassword")}
            />
            {confirmPasswordError ? (
              <FieldError>{confirmPasswordError}</FieldError>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="edit-user-role" label="Role" hint="All roles" />
            <Select
              value={selectedRole}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValue("role", value as UpdateManagerUserInput["role"], {
                  shouldValidate: true,
                });

                if (value === ROLES.STUDENT && !watch("status")) {
                  setValue("status", STUDENT_STATUSES.ACTIVE, {
                    shouldValidate: true,
                  });
                }
              }}
              disabled={isPending}
            >
              <SelectTrigger
                id="edit-user-role"
                className="w-full"
                aria-invalid={!!roleError}
              >
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {MANAGER_USER_EDITABLE_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {MANAGER_USER_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {roleError ? (
              <FieldError>{roleError}</FieldError>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-user-is-instructor"
              label="Instructor"
              hint="Can teach scheduled sessions"
            />
            <div className="flex h-8 items-center gap-2.5 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30">
              <Checkbox
                id="edit-user-is-instructor"
                checked={isInstructor}
                disabled={isPending}
                onCheckedChange={(checked) =>
                  setValue("is_instructor", checked, {
                    shouldValidate: true,
                  })
                }
              />
              <label
                htmlFor="edit-user-is-instructor"
                className="cursor-pointer text-muted-foreground"
              >
                {isInstructor ? "Enabled" : "Disabled"}
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="edit-user-is-mentor"
              label="Mentor"
              hint="Can mentor students"
            />
            <div className="flex h-8 items-center gap-2.5 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30">
              <Checkbox
                id="edit-user-is-mentor"
                checked={isMentor}
                disabled={isPending}
                onCheckedChange={(checked) =>
                  setValue("is_mentor", checked, {
                    shouldValidate: true,
                  })
                }
              />
              <label
                htmlFor="edit-user-is-mentor"
                className="cursor-pointer text-muted-foreground"
              >
                {isMentor ? "Enabled" : "Disabled"}
              </label>
            </div>
          </div>

          {isStudentRole ? (
            <>
              <div className="flex flex-col gap-2">
                <FieldLabel
                  htmlFor="edit-user-full-name"
                  label="Full name"
                  hint={AUTH_FIELD_HINTS.fullName}
                />
                <Input
                  id="edit-user-full-name"
                  type="text"
                  autoComplete="name"
                  minLength={AUTH_LIMITS.fullName.min}
                  maxLength={AUTH_LIMITS.fullName.max}
                  aria-invalid={!!fullNameError}
                  disabled={isPending}
                  {...register("fullName")}
                />
                {fullNameError ? (
                  <FieldError>{fullNameError}</FieldError>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <FieldLabel
                  htmlFor="edit-user-phone"
                  label="Phone"
                  hint={AUTH_FIELD_HINTS.phone}
                />
                <Input
                  id="edit-user-phone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={AUTH_LIMITS.phone.max}
                  aria-invalid={!!phoneError}
                  disabled={isPending}
                  {...register("phone")}
                />
                {phoneError ? (
                  <FieldError>{phoneError}</FieldError>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <FieldLabel
                  htmlFor="edit-user-birth-date"
                  label="Birth date"
                  hint={AUTH_FIELD_HINTS.birthDate}
                />
                <Input
                  id="edit-user-birth-date"
                  type="date"
                  max={getLocalIsoDate()}
                  aria-invalid={!!birthDateError}
                  disabled={isPending}
                  {...register("birthDate")}
                />
                {birthDateError ? (
                  <FieldError>{birthDateError}</FieldError>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <FieldLabel
                  htmlFor="edit-user-status"
                  label="Student status"
                  hint="Enrollment status"
                />
                <Select
                  value={selectedStatus ?? STUDENT_STATUSES.ACTIVE}
                  onValueChange={(value) => {
                    if (!value) {
                      return;
                    }

                    setValue("status", value as StudentStatusValue, {
                      shouldValidate: true,
                    });
                  }}
                  disabled={isPending}
                >
                  <SelectTrigger
                    id="edit-user-status"
                    className="w-full"
                    aria-invalid={!!statusError}
                  >
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STUDENT_STATUS_VALUES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {MANAGER_STUDENT_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {statusError ? (
                  <FieldError>{statusError}</FieldError>
                ) : null}
              </div>
            </>
          ) : null}
        </form>

        <DialogFooter className="mt-0 shrink-0 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="edit-user-form" disabled={isPending}>
            {isPending ? <InlineSpinner data-icon="inline-start" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
