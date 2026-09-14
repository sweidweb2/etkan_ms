"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PERMISSION_DEFINITIONS,
  type PermissionKey,
} from "@/lib/constants/permissions";
import type { UserAccessBreakdown } from "@/services/auth/user-permissions.service";

type UserPermissionsSectionProps = {
  breakdown: UserAccessBreakdown;
  canEdit: boolean;
  onEdit: () => void;
};

function keyLabel(key: PermissionKey): string {
  return (
    PERMISSION_DEFINITIONS.find((definition) => definition.key === key)?.label ??
    key
  );
}

export function UserPermissionsSection({
  breakdown,
  canEdit,
  onEdit,
}: UserPermissionsSectionProps) {
  const allowKeys = useMemo(
    () => [...breakdown.allowKeys].sort(),
    [breakdown.allowKeys]
  );

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-lg">Private extras</CardTitle>
        <CardAction className="self-center">
          {canEdit ? (
            <Button type="button" variant="outline" onClick={onEdit}>
              Edit extras
            </Button>
          ) : null}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-4">
        <p className="text-sm text-muted-foreground">
          Permissions granted beyond this user’s role ({breakdown.roleKeys.length}{" "}
          from role).
        </p>

        {allowKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No private extras.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {allowKeys.map((key) => (
              <li key={key} className="px-3 py-2">
                <p className="text-sm font-medium">{keyLabel(key)}</p>
                <p className="font-mono text-xs text-muted-foreground">{key}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
