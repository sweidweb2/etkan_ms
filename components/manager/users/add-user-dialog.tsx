"use client";

import { useEffect } from "react";
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
import { AUTH_FIELD_HINTS } from "@/lib/constants/auth-field-hints";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import {
  MANAGER_CREATABLE_ROLE_LABELS,
  MANAGER_CREATABLE_ROLES,
} from "@/lib/constants/manager-user-roles";
import { ROLES } from "@/lib/constants/roles";
import { showSuccessToast } from "@/lib/toast";
import {
  createStaffUserSchema,
  type CreateStaffUserInput,
} from "@/lib/validators/manager/create-user";
import type { ManagerUserRow } from "@/types/manager-user";

type AddUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateUser: (user: ManagerUserRow) => void;
  existingUsers: ManagerUserRow[];
};

export function AddUserDialog({
  open,
  onOpenChange,
  onCreateUser,
  existingUsers,
}: AddUserDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<CreateStaffUserInput>({
    resolver: zodResolver(createStaffUserSchema),
    mode: "onBlur",
    defaultValues: {
      username: "",
      email: "",
      password: "",
      role: ROLES.TEACHER,
    },
  });

  const selectedRole = watch("role");

  useEffect(() => {
    if (!open) {
      reset({
        username: "",
        email: "",
        password: "",
        role: ROLES.TEACHER,
      });
    }
  }, [open, reset]);

  function onSubmit(values: CreateStaffUserInput) {
    const normalizedUsername = values.username.trim().toLowerCase();
    const normalizedEmail = values.email.trim().toLowerCase();

    const usernameTaken = existingUsers.some(
      (user) => user.username?.toLowerCase() === normalizedUsername
    );
    if (usernameTaken) {
      setError("username", { message: "This username is already taken." });
      return;
    }

    const emailTaken = existingUsers.some(
      (user) => user.email.toLowerCase() === normalizedEmail
    );
    if (emailTaken) {
      setError("email", { message: "This email is already in use." });
      return;
    }

    onCreateUser({
      id: crypto.randomUUID(),
      username: values.username.trim(),
      email: values.email.trim(),
      role: values.role,
      created_at: new Date().toISOString(),
    });

    showSuccessToast("User added to the preview list.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            Create a staff account. Student role is not available here.
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-user-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-user-username"
              label="Username"
              hint={AUTH_FIELD_HINTS.username}
            />
            <Input
              id="add-user-username"
              type="text"
              autoComplete="username"
              placeholder="staff_username"
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
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="add-user-password"
              label="Password"
              hint={AUTH_FIELD_HINTS.password}
            />
            <Input
              id="add-user-password"
              type="password"
              autoComplete="new-password"
              minLength={AUTH_LIMITS.password.min}
              maxLength={AUTH_LIMITS.password.max}
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="add-user-role" label="Role" hint="Staff roles only" />
            <Select
              value={selectedRole}
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
                aria-invalid={!!errors.role}
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
          <Button type="submit" form="add-user-form">
            Create user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
