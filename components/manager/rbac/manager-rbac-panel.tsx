"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  updateRolePermissionsAction,
  type UpdateRolePermissionsActionState,
} from "@/app/manager/rbac/actions";
import { Can } from "@/components/auth/can";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import {
  PERMISSION_FEATURE_LABELS,
  PERMISSION_FEATURES,
  PERMISSIONS,
  type PermissionDefinition,
  type PermissionFeature,
  type PermissionKey,
} from "@/lib/constants/permissions";
import { MANAGER_USER_ROLE_LABELS } from "@/lib/constants/manager-user-display";
import { ROLE_VALUES, ROLES, type RoleValue } from "@/lib/constants/roles";

type ManagerRbacPanelProps = {
  initialGrantsByRole: Record<RoleValue, PermissionKey[]>;
  catalog: readonly PermissionDefinition[];
};

const initialActionState: UpdateRolePermissionsActionState = {};

function sortedKeys(keys: Iterable<PermissionKey>): PermissionKey[] {
  return [...keys].sort();
}

function sameKeySet(a: PermissionKey[], b: PermissionKey[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const left = sortedKeys(a);
  const right = sortedKeys(b);
  return left.every((key, index) => key === right[index]);
}

export function ManagerRbacPanel({
  initialGrantsByRole,
  catalog,
}: ManagerRbacPanelProps) {
  const [grantsByRole, setGrantsByRole] = useState(initialGrantsByRole);
  const [selectedRole, setSelectedRole] = useState<RoleValue>(ROLES.MANAGER);
  const [draftKeys, setDraftKeys] = useState<PermissionKey[]>(
    () => initialGrantsByRole[ROLES.MANAGER] ?? []
  );

  const [state, formAction, isActionPending] = useActionState(
    updateRolePermissionsAction,
    initialActionState
  );
  useActionStateToast(state, isActionPending);

  useEffect(() => {
    setGrantsByRole(initialGrantsByRole);
  }, [initialGrantsByRole]);

  useEffect(() => {
    setDraftKeys(grantsByRole[selectedRole] ?? []);
  }, [selectedRole, grantsByRole]);

  const grouped = useMemo(() => {
    return PERMISSION_FEATURES.map((feature) => ({
      feature,
      definitions: catalog.filter(
        (definition) => definition.feature === feature
      ),
    })).filter((group) => group.definitions.length > 0);
  }, [catalog]);

  const savedKeys = grantsByRole[selectedRole] ?? [];
  const isDirty = !sameKeySet(draftKeys, savedKeys);
  const draftSet = useMemo(() => new Set(draftKeys), [draftKeys]);

  function handleRoleChange(role: string | null) {
    if (!role) {
      return;
    }
    setSelectedRole(role as RoleValue);
  }

  function toggleKey(key: PermissionKey, checked: boolean) {
    setDraftKeys((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return sortedKeys(next);
    });
  }

  function setFeatureKeys(feature: PermissionFeature, checked: boolean) {
    const featureKeys = catalog
      .filter((definition) => definition.feature === feature)
      .map((definition) => definition.key);
    setDraftKeys((prev) => {
      const next = new Set(prev);
      for (const key of featureKeys) {
        if (checked) {
          next.add(key);
        } else {
          next.delete(key);
        }
      }
      return sortedKeys(next);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Permissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Grant or revoke permissions for each role. Changes apply on the next
          request.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b bg-muted/40">
          <CardTitle>Role permissions</CardTitle>
          <CardDescription>
            Select a role, then toggle permissions by feature group.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex w-full max-w-sm flex-col gap-2">
              <label htmlFor="rbac-role" className="text-sm font-medium">
                Role
              </label>
              <Select value={selectedRole} onValueChange={handleRoleChange}>
                <SelectTrigger id="rbac-role" aria-label="Select role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_VALUES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {MANAGER_USER_ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Can permission={PERMISSIONS.RBAC_MANAGE}>
              <form action={formAction} className="flex flex-wrap gap-2">
                <input type="hidden" name="role" value={selectedRole} />
                {draftKeys.map((key) => (
                  <input
                    key={key}
                    type="hidden"
                    name="permissionKeys"
                    value={key}
                  />
                ))}
                <Button
                  type="button"
                  variant="outline"
                  disabled={isActionPending || !isDirty}
                  onClick={() => setDraftKeys(savedKeys)}
                >
                  Reset
                </Button>
                <Button type="submit" disabled={isActionPending || !isDirty}>
                  {isActionPending ? <InlineSpinner /> : null}
                  Save permissions
                </Button>
              </form>
            </Can>
          </div>

          <div className="flex flex-col gap-4">
            {grouped.map(({ feature, definitions }) => {
              const allChecked = definitions.every((definition) =>
                draftSet.has(definition.key)
              );
              const someChecked =
                !allChecked &&
                definitions.some((definition) => draftSet.has(definition.key));

              return (
                <section
                  key={feature}
                  className="rounded-lg border border-border"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
                    <h2 className="text-sm font-semibold">
                      {PERMISSION_FEATURE_LABELS[feature]}
                    </h2>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={allChecked || isActionPending}
                        onClick={() => setFeatureKeys(feature, true)}
                      >
                        Select all
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={(!allChecked && !someChecked) || isActionPending}
                        onClick={() => setFeatureKeys(feature, false)}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  <ul className="divide-y divide-border">
                    {definitions.map((definition) => {
                      const checked = draftSet.has(definition.key);
                      return (
                        <li
                          key={definition.key}
                          className="flex items-start gap-3 px-4 py-3"
                        >
                          <input
                            id={`perm-${definition.key}`}
                            type="checkbox"
                            checked={checked}
                            disabled={isActionPending}
                            onChange={(event) =>
                              toggleKey(definition.key, event.target.checked)
                            }
                            className="mt-0.5 size-4 shrink-0 rounded border border-input accent-primary"
                            aria-label={definition.label}
                          />
                          <label
                            htmlFor={`perm-${definition.key}`}
                            className="min-w-0 flex-1 cursor-pointer"
                          >
                            <span className="block text-sm font-medium">
                              {definition.label}
                            </span>
                            <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                              {definition.key}
                              <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                                {definition.access}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
