"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";
import {
  resetPasswordsByRoleAction,
  type ResetPasswordsByRoleActionState,
} from "@/app/manager/settings/actions";
import { Can } from "@/components/auth/can";
import { FieldLabel } from "@/components/auth/field-label";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { MANAGER_USER_ROLE_LABELS } from "@/lib/constants/manager-user-display";
import {
  PASSWORD_RESET_BY_ROLE_VALUES,
  type PasswordResetByRoleValue,
} from "@/lib/constants/password-reset-roles";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { downloadBlob } from "@/lib/export/download-blob";

const initialState: ResetPasswordsByRoleActionState = {};

export function ResetPasswordsByRoleSection() {
  const [role, setRole] = useState<PasswordResetByRoleValue | "">("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    resetPasswordsByRoleAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  const handleConfirmOpenChange = usePendingAwareOpenChange(
    isPending,
    setConfirmOpen
  );

  useActionStateToast(state, isPending);

  useActionStateSuccess(state, isPending, async (next) => {
    if (!next.rows?.length) {
      return;
    }

    const { buildPasswordResetXlsxBlob, passwordResetXlsxFilename } =
      await import("@/lib/export/password-reset-xlsx");
    const blob = await buildPasswordResetXlsxBlob(next.rows);
    downloadBlob({
      blob,
      filename: passwordResetXlsxFilename(next.role ?? "users"),
    });
    setConfirmOpen(false);
    setRole("");
  });

  const roleError = state.fieldErrors?.role?.[0];
  const roleLabel = role ? MANAGER_USER_ROLE_LABELS[role] : "";

  function openConfirm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!role || isPending) {
      return;
    }
    setConfirmOpen(true);
  }

  function confirmReset() {
    if (!role || isPending) {
      return;
    }

    const formData = new FormData();
    formData.set("role", role);
    startTransition(() => formAction(formData));
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Reset passwords by role</CardTitle>
          <CardDescription>
            Generates a unique random password for every user with the selected
            role (manager and CEO excluded). Plaintext credentials download as
            Excel immediately after reset.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={openConfirm} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-2">
              <FieldLabel
                htmlFor="reset-passwords-role"
                label="Role"
                hint="Manager and CEO excluded"
              />
              <Select
                value={role || null}
                disabled={isPending}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }
                  setRole(value as PasswordResetByRoleValue);
                }}
              >
                <SelectTrigger
                  id="reset-passwords-role"
                  className="w-full"
                  aria-invalid={!!roleError}
                >
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {PASSWORD_RESET_BY_ROLE_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {MANAGER_USER_ROLE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {roleError ? (
                <p className="text-sm text-destructive">{roleError}</p>
              ) : null}
            </div>

            <div className="flex justify-end">
              <Can permission={PERMISSIONS.SETTINGS_RESET_PASSWORDS}>
                <Button
                  type="submit"
                  size="sm"
                  variant="destructive"
                  disabled={isPending || !role}
                >
                  {isPending ? <InlineSpinner /> : "Change passwords"}
                </Button>
              </Can>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={handleConfirmOpenChange}>
        <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>Reset {roleLabel} passwords?</DialogTitle>
            <DialogDescription>
              Every {roleLabel || "selected"} account will get a new unique
              password. An Excel file with plaintext credentials will download
              when finished. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleConfirmOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmReset}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <InlineSpinner />
                  Resetting…
                </>
              ) : (
                "Reset passwords"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
