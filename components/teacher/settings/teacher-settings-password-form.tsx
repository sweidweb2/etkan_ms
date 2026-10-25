"use client";

import { useEffect } from "react";
import {
  changeOwnTeacherPasswordAction,
  type ChangeOwnTeacherPasswordActionState,
} from "@/app/teacher/settings/actions";
import { ChangeOwnPasswordFields } from "@/components/auth/change-own-password-fields";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useFormActionState } from "@/hooks/use-form-action-state";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  changeOwnPasswordSchema,
  type ChangeOwnPasswordInput,
} from "@/lib/validators/auth/change-own-password";

const initialState: ChangeOwnTeacherPasswordActionState = {};

const emptyValues: ChangeOwnPasswordInput = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function TeacherSettingsPasswordForm() {
  const [state, formAction, isPending] = useFormActionState(
    changeOwnTeacherPasswordAction,
    initialState
  );

  useActionStateToast(state, isPending);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm({
    schema: changeOwnPasswordSchema,
    mode: "onBlur",
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (state.success) {
      reset(emptyValues);
    }
  }, [state.success, reset]);

  function onSubmit(values: ChangeOwnPasswordInput) {
    const formData = new FormData();
    formData.set("currentPassword", values.currentPassword);
    formData.set("newPassword", values.newPassword);
    formData.set("confirmPassword", values.confirmPassword);
    formAction(formData);
  }

  return (
    <Card className="h-full gap-0 border-border/70 bg-card py-0 shadow-[0_10px_28px_-24px_rgba(62,62,117,0.22)]">
      <CardHeader className="border-b border-border/50 bg-muted/25 px-5 py-4">
        <CardTitle className="text-base">Password</CardTitle>
        <CardDescription>
          Confirm your current password, then choose a new one.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 py-5">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <ChangeOwnPasswordFields
            idPrefix="teacher"
            disabled={isPending}
            register={register}
            errors={errors}
            fieldErrors={state.fieldErrors}
          />

          <div className="flex justify-end pt-1">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? <InlineSpinner /> : null}
              Update password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
