"use client";

import { useActionState, useMemo, useState, useTransition, type FormEvent } from "react";
import {
  resetUserPasswordAction,
  type ResetUserPasswordActionState,
} from "@/app/manager/settings/actions";
import { Can } from "@/components/auth/can";
import { FieldLabel } from "@/components/auth/field-label";
import { PasswordInput } from "@/components/auth/password-input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { AUTH_FIELD_HINTS } from "@/lib/constants/auth-field-hints";
import { AUTH_LIMITS } from "@/lib/constants/auth-limits";
import { MANAGER_USER_ROLE_LABELS } from "@/lib/constants/manager-user-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type { PasswordResetUserOption } from "@/types/password-reset";

const initialState: ResetUserPasswordActionState = {};

type ResetUserPasswordSectionProps = {
  users: PasswordResetUserOption[];
};

function userOptionLabel(user: PasswordResetUserOption): string {
  const roleLabel = MANAGER_USER_ROLE_LABELS[user.role] ?? user.role;
  if (user.email) {
    return `${user.username} · ${user.email} (${roleLabel})`;
  }
  return `${user.username} (${roleLabel})`;
}

export function ResetUserPasswordSection({
  users,
}: ResetUserPasswordSectionProps) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    resetUserPasswordAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  useActionStateToast(state, isPending);

  useActionStateSuccess(state, isPending, () => {
    setPassword("");
    setUserId("");
    setUserFilter("");
  });

  const filteredUsers = useMemo(() => {
    const query = userFilter.trim().toLowerCase();
    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const haystack = `${user.username} ${user.email} ${user.role}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [userFilter, users]);

  const selectedUser = users.find((user) => user.id === userId) ?? null;
  const userIdError = state.fieldErrors?.userId?.[0];
  const passwordError = state.fieldErrors?.password?.[0];

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Reset user password</CardTitle>
        <CardDescription>
          Set a custom password for one account, or use the dice icon to
          generate a strong random password. No Excel download.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="reset-user-id"
              label="User"
              hint="Any account"
            />
            {users.length > 5 ? (
              <Input
                id="reset-user-filter"
                value={userFilter}
                onChange={(event) => setUserFilter(event.target.value)}
                placeholder="Filter by name, email, or role"
                disabled={isPending}
              />
            ) : null}
            <Select
              value={userId || null}
              disabled={isPending || filteredUsers.length === 0}
              onValueChange={(value) => {
                if (!value) {
                  return;
                }
                setUserId(value);
              }}
            >
              <SelectTrigger
                id="reset-user-id"
                className="w-full"
                aria-invalid={!!userIdError}
              >
                <SelectValue placeholder="Select a user">
                  {selectedUser ? userOptionLabel(selectedUser) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {filteredUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {userOptionLabel(user)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="userId" value={userId} />
            {userIdError ? (
              <p className="text-sm text-destructive">{userIdError}</p>
            ) : null}
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No users available.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <FieldLabel
              htmlFor="reset-user-password"
              label="New password"
              hint={AUTH_FIELD_HINTS.password}
            />
            <PasswordInput
              id="reset-user-password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={AUTH_LIMITS.password.min}
              maxLength={AUTH_LIMITS.password.max}
              aria-invalid={!!passwordError}
              disabled={isPending}
              onGeneratePassword={setPassword}
            />
            {passwordError ? (
              <p className="text-sm text-destructive">{passwordError}</p>
            ) : null}
          </div>

          <div className="flex justify-end">
            <Can permission={PERMISSIONS.SETTINGS_RESET_PASSWORDS}>
              <Button
                type="submit"
                size="sm"
                disabled={isPending || !userId || !password}
              >
                {isPending ? <InlineSpinner /> : "Change password"}
              </Button>
            </Can>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
