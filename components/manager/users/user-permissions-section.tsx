"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PERMISSION_DEFINITIONS,
  PERMISSION_FEATURE_LABELS,
  type PermissionKey,
} from "@/lib/constants/permissions";
import { cn } from "@/lib/utils";
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
  const roleSet = useMemo(
    () => new Set(breakdown.roleKeys),
    [breakdown.roleKeys]
  );
  const effectiveSet = useMemo(
    () => new Set(breakdown.effectiveKeys),
    [breakdown.effectiveKeys]
  );
  const privateAllows = useMemo(() => {
    const set = new Set<PermissionKey>();
    for (const row of breakdown.overlayRows) {
      if (row.effect === "allow") {
        set.add(row.permission_key);
      }
    }
    return set;
  }, [breakdown.overlayRows]);

  const displayKeys = useMemo(() => {
    const keys = new Set<PermissionKey>([
      ...breakdown.roleKeys,
      ...breakdown.effectiveKeys,
      ...breakdown.overlayRows.map((row) => row.permission_key),
    ]);
    return [...keys].sort();
  }, [breakdown]);

  const grouped = useMemo(() => {
    const byFeature = new Map<string, PermissionKey[]>();
    for (const key of displayKeys) {
      const definition = PERMISSION_DEFINITIONS.find((item) => item.key === key);
      const feature = definition?.feature ?? "other";
      const list = byFeature.get(feature) ?? [];
      list.push(key);
      byFeature.set(feature, list);
    }
    return [...byFeature.entries()].map(([feature, keys]) => ({
      feature,
      label:
        PERMISSION_FEATURE_LABELS[
          feature as keyof typeof PERMISSION_FEATURE_LABELS
        ] ?? feature,
      keys,
    }));
  }, [displayKeys]);

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-lg">Permissions</CardTitle>
        <CardAction className="self-center">
          {canEdit ? (
            <Button type="button" variant="outline" onClick={onEdit}>
              Edit private permissions
            </Button>
          ) : null}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-4">
        <p className="text-sm text-muted-foreground">
          Effective access = role grants ∪ private allows.
        </p>

        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg border px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              From role
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {breakdown.roleKeys.length}
            </p>
          </div>
          <div className="rounded-lg border px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Private allows
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {breakdown.overlayRows.length}
            </p>
          </div>
          <div className="rounded-lg border px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Effective
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {breakdown.effectiveKeys.length}
            </p>
          </div>
        </div>

        {displayKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No role grants or private overlays for this user.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {grouped.map((group) => (
              <div key={group.feature} className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">{group.label}</h3>
                <ul className="divide-y rounded-lg border">
                  {group.keys.map((key) => {
                    const fromRole = roleSet.has(key);
                    const isPrivate = privateAllows.has(key);
                    const effective = effectiveSet.has(key);

                    return (
                      <li
                        key={key}
                        className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {keyLabel(key)}
                          </p>
                          <p className="truncate font-mono text-xs text-muted-foreground">
                            {key}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5",
                              fromRole
                                ? "bg-muted text-foreground"
                                : "bg-muted/50 text-muted-foreground"
                            )}
                          >
                            {fromRole ? "Role" : "Not on role"}
                          </span>
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5",
                              isPrivate
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                : "bg-muted/50 text-muted-foreground"
                            )}
                          >
                            {isPrivate ? "Private allow" : "No private"}
                          </span>
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 font-medium",
                              effective
                                ? "bg-primary/15 text-primary"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {effective ? "Effective" : "Not effective"}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
