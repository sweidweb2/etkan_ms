"use client";

import { useActionState, useTransition, type FormEvent } from "react";
import { useState } from "react";
import { Can } from "@/components/auth/can";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type {
  UpdateMaintenanceModeActionState,
} from "@/app/manager/settings/actions";
import { updateMaintenanceModeAction } from "@/app/manager/settings/actions";

const initialState: UpdateMaintenanceModeActionState = {};

export function MaintenanceModeSection({
  initialEnabled,
}: {
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);

  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    updateMaintenanceModeAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;

  useActionStateToast(state, isPending);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Maintenance mode</CardTitle>
        <CardDescription>
          Temporarily disable the app and show the maintenance page. Manager
          settings stay accessible so you can turn it off.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex items-center gap-4">
          <input
            type="hidden"
            name="maintenanceMode"
            value={enabled ? "true" : "false"}
          />

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-sm font-medium">Enabled</span>
            <span className="text-xs text-muted-foreground">
              {enabled ? "The app is currently in maintenance mode." : "The app is live."}
            </span>
          </div>

          <Can permission={PERMISSIONS.SETTINGS_MAINTENANCE}>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              aria-label="Toggle maintenance mode"
            />

            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? <InlineSpinner /> : "Save"}
            </Button>
          </Can>
        </form>
      </CardContent>
    </Card>
  );
}

