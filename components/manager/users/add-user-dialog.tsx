"use client";

import { useEffect } from "react";
import { createStaffUserAction } from "@/app/manager/users/actions";
import { FieldLabel } from "@/components/auth/field-label";
import { PasswordInput } from "@/components/auth/password-input";
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
import { useMutationDialogForm } from "@/hooks/use-mutation-dialog-form";
import { useZodForm } from "@/hooks/use-zod-form";
import { AUTH_FIELD_HINTS } from "@/lib/constants/auth-field-hints";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import {
  MANAGER_CREATABLE_ROLE_LABELS,
  MANAGER_CREATABLE_ROLES,
} from "@/lib/constants/manager-user-roles";
import { ROLES } from "@/lib/constants/roles";
import {
  createStaffUserSchema,
  type CreateStaffUserFormInput,
  type CreateStaffUserInput,
} from "@/lib/validators/manager/create-user";
import type {
  CreateStaffUserActionState,
  ManagerUserRow,
} from "@/types/manager-user";

const initialState: CreateStaffUserActionState = {};

type AddUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: (user: ManagerUserRow) => void;
};

export function AddUserDialog({
  open,
  onOpenChange,
  onUserCreated,
}: AddUserDialogProps) {
  const { state, formAction, isPending, handleOpenChange } =
    useMutationDialogForm({
      action: createStaffUserAction,
      initialState,
      open,
      onOpenChange,
      onSuccess: (nextState) => {
        onOpenChange(false);
        if (nextState.user) {
          onUserCreated(nextState.user);
        }
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
    schema: createStaffUserSchema,
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      role: ROLES.TEACHER,
      is_instructor: false,
    },
  });

  const selectedRole = watch("role");
  const isInstructor = watch("is_instructor");

  useEffect(() => {
    if (!open) {
      reset({
        fullName: "",
        email: "",
        password: "",
        role: ROLES.TEACHER,
        is_instructor: false,
      });
    }
  }, [open, reset]);

  function onSubmit(values: CreateStaffUserFormInput) {
    const formData = new FormData();
    formData.set("fullName", values.fullName.trim());
    formData.set("email", values.email.trim());
    formData.set("password", values.password ?? "");
    formData.set("role", values.role);
    formData.set("is_instructor", String(values.is_instructor));
    formAction(formData);
  }

  const fullNameError =
    errors.fullName?.message ?? state.fieldErrors?.fullName?.[0];
  const emailError = errors.email?.message ?? state.fieldErrors?.email?.[0];
  const passwordError =
    errors.password?.message ?? state.fieldErrors?.password?.[0];
  const roleError = errors.role?.message ?? state.fieldErrors?.role?.[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            Create a staff account. Student role is not available here. Leave
            password blank to use the default.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-user-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 px-2"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-user-full-name"
              label="Full name"
              hint={AUTH_FIELD_HINTS.fullName}
            />
            <Input
              id="add-user-full-name"
              type="text"
              autoComplete="name"
              placeholder="Staff member's full name"
              minLength={AUTH_LIMITS.fullName.min}
              maxLength={AUTH_LIMITS.fullName.max}
              aria-invalid={!!fullNameError}
              disabled={isPending}
              {...register("fullName")}
            />
            {fullNameError ? (
              <p className="text-sm text-destructive">{fullNameError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-user-email"
              label="Email"
              hint={AUTH_FIELD_HINTS.email}
            />
            <Input
              id="add-user-email"
              type="email"
              autoComplete="email"
              placeholder="name@school.edu"
              minLength={AUTH_LIMITS.email.min}
              maxLength={AUTH_LIMITS.email.max}
              aria-invalid={!!emailError}
              disabled={isPending}
              {...register("email")}
            />
            {emailError ? (
              <p className="text-sm text-destructive">{emailError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-user-password"
              label="Password"
              hint={AUTH_FIELD_HINTS.passwordOptional}
            />
            <PasswordInput
              id="add-user-password"
              autoComplete="new-password"
              maxLength={AUTH_LIMITS.password.max}
              aria-invalid={!!passwordError}
              disabled={isPending}
              onGeneratePassword={(password) => {
                setValue("password", password, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
              {...register("password")}
            />
            {passwordError ? (
              <p className="text-sm text-destructive">{passwordError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="add-user-role" label="Role" hint="Staff roles only" />
            <Select
              value={selectedRole}
              disabled={isPending}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValue("role", value as CreateStaffUserInput["role"], {
                  shouldValidate: true,
                });
              }}
            >
              <SelectTrigger
                id="add-user-role"
                className="w-full"
                aria-invalid={!!roleError}
              >
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {MANAGER_CREATABLE_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {MANAGER_CREATABLE_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {roleError ? (
              <p className="text-sm text-destructive">{roleError}</p>
            ) : null}
          </div>

          <label
            htmlFor="add-user-is-instructor"
            className="flex items-center gap-2 text-sm"
          >
            <input
              id="add-user-is-instructor"
              type="checkbox"
              checked={isInstructor}
              disabled={isPending}
              onChange={(event) =>
                setValue("is_instructor", event.target.checked, {
                  shouldValidate: true,
                })
              }
            />
            Workshop instructor (unlocks Manage workshops)
          </label>
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
          <Button type="submit" form="add-user-form" disabled={isPending}>
            {isPending ? (
              <>
                <InlineSpinner className="mr-2" />
                Creating…
              </>
            ) : (
              "Create user"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
