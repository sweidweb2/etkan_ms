"use client";

import { useEffect } from "react";
import { useZodForm } from "@/hooks/use-zod-form";
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
import { AUTH_FIELD_HINTS } from "@/lib/constants/auth-field-hints";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import {
  MANAGER_USER_EDITABLE_ROLES,
  MANAGER_USER_ROLE_LABELS,
} from "@/lib/constants/manager-user-display";
import { MANAGER_USERS_MOCK } from "@/lib/constants/manager-users-mock";
import { showSuccessToast } from "@/lib/toast";
import {
  updateManagerUserSchema,
  type UpdateManagerUserInput,
} from "@/lib/validators/manager/update-user";
import type { ManagerUserRow } from "@/types/manager-user";

type EditUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ManagerUserRow;
  onUpdateUser: (user: ManagerUserRow) => void;
};

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  onUpdateUser,
}: EditUserDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useZodForm({
    schema: updateManagerUserSchema,
    mode: "onBlur",
    defaultValues: {
      username: user.username ?? "",
      email: user.email,
      role: user.role,
    },
  });

  const selectedRole = watch("role");

  useEffect(() => {
    if (open) {
      reset({
        username: user.username ?? "",
        email: user.email,
        role: user.role,
      });
    }
  }, [open, reset, user]);

  function onSubmit(values: UpdateManagerUserInput) {
    const normalizedUsername = values.username.trim().toLowerCase();
    const normalizedEmail = values.email.trim().toLowerCase();

    const usernameTaken = MANAGER_USERS_MOCK.some(
      (existingUser) =>
        existingUser.id !== user.id &&
        existingUser.username?.toLowerCase() === normalizedUsername
    );
    if (usernameTaken) {
      setError("username", { message: "This username is already taken." });
      return;
    }

    const emailTaken = MANAGER_USERS_MOCK.some(
      (existingUser) =>
        existingUser.id !== user.id &&
        existingUser.email.toLowerCase() === normalizedEmail
    );
    if (emailTaken) {
      setError("email", { message: "This email is already in use." });
      return;
    }

    onUpdateUser({
      ...user,
      username: values.username.trim(),
      email: values.email.trim(),
      role: values.role,
    });

    showSuccessToast("User details updated in the preview.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update account details. Changes are preview-only until backend is
            connected.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-user-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
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
              aria-invalid={!!errors.username}
              {...register("username")}
            />
            {errors.username ? (
              <p className="text-sm text-destructive">{errors.username.message}</p>
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
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-sm text-destructive">{errors.email.message}</p>
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
              }}
            >
              <SelectTrigger
                id="edit-user-role"
                className="w-full"
                aria-invalid={!!errors.role}
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
            {errors.role ? (
              <p className="text-sm text-destructive">{errors.role.message}</p>
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
          <Button type="submit" form="edit-user-form">
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
