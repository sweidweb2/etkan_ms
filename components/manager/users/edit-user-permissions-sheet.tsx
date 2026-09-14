"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  replaceUserPermissionsAction,
  type ReplaceUserPermissionsActionState,
} from "@/app/manager/users/actions";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import {
  PERMISSION_DEFINITIONS,
  PERMISSION_FEATURE_LABELS,
  PERMISSION_FEATURES,
  type PermissionKey,
} from "@/lib/constants/permissions";
import { cn } from "@/lib/utils";
import type { UserAccessBreakdown } from "@/services/auth/user-permissions.service";

const initialState: ReplaceUserPermissionsActionState = {};

type OverlayEffect = "default" | "allow" | "deny";

type EditUserPermissionsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userLabel: string;
  breakdown: UserAccessBreakdown | null;
  onSaved: (breakdown: UserAccessBreakdown) => void;
};

function effectFromBreakdown(
  breakdown: UserAccessBreakdown | null
): Record<PermissionKey, OverlayEffect> {
  const next = {} as Record<PermissionKey, OverlayEffect>;
  for (const definition of PERMISSION_DEFINITIONS) {
    next[definition.key] = "default";
  }
  if (!breakdown) {
    return next;
  }
  for (const row of breakdown.overlayRows) {
    next[row.permission_key] = row.effect;
  }
  return next;
}

export function EditUserPermissionsSheet({
  open,
  onOpenChange,
  userId,
  userLabel,
  breakdown,
  onSaved,
}: EditUserPermissionsSheetProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    replaceUserPermissionsAction,
    initialState
  );
  const isPending = isActionPending || isTransitionPending;
  const handleOpenChange = usePendingAwareOpenChange(isPending, onOpenChange);

  const [effects, setEffects] = useState(() => effectFromBreakdown(breakdown));
  const [searchQuery, setSearchQuery] = useState("");

  useActionStateToast(state, isPending);

  useEffect(() => {
    if (open) {
      setEffects(effectFromBreakdown(breakdown));
      setSearchQuery("");
    }
  }, [open, breakdown]);

  useActionStateSuccess(state, isPending, () => {
    if (!breakdown) {
      onOpenChange(false);
      return;
    }

    const roleSet = new Set(breakdown.roleKeys);
    const overlayRows = (
      Object.entries(effects) as [PermissionKey, OverlayEffect][]
    )
      .filter(([, effect]) => effect !== "default")
      .map(([permission_key, effect]) => ({
        permission_key,
        effect: effect as "allow" | "deny",
        granted_by: null,
        created_at: new Date().toISOString(),
      }));

    const allows = overlayRows
      .filter((row) => row.effect === "allow")
      .map((row) => row.permission_key);
    const denies = new Set(
      overlayRows
        .filter((row) => row.effect === "deny")
        .map((row) => row.permission_key)
    );

    const effective = new Set<PermissionKey>([...roleSet, ...allows]);
    for (const key of denies) {
      effective.delete(key);
    }

    onSaved({
      ...breakdown,
      overlayRows,
      effectiveKeys: [...effective].sort(),
    });
    onOpenChange(false);
  });

  const roleSet = useMemo(
    () => new Set(breakdown?.roleKeys ?? []),
    [breakdown]
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const grouped = useMemo(() => {
    return PERMISSION_FEATURES.map((feature) => ({
      feature,
      label: PERMISSION_FEATURE_LABELS[feature],
      definitions: PERMISSION_DEFINITIONS.filter((definition) => {
        if (definition.feature !== feature) {
          return false;
        }
        if (!normalizedSearch) {
          return true;
        }
        const haystack =
          `${definition.key} ${definition.label} ${PERMISSION_FEATURE_LABELS[feature]}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      }),
    })).filter((group) => group.definitions.length > 0);
  }, [normalizedSearch]);

  function setEffect(key: PermissionKey, effect: OverlayEffect) {
    setEffects((prev) => ({ ...prev, [key]: effect }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("userId", userId);

    for (const [key, effect] of Object.entries(effects) as [
      PermissionKey,
      OverlayEffect,
    ][]) {
      if (effect === "default") {
        continue;
      }
      formData.append("permissionKey", key);
      formData.append("effect", effect);
    }

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 sm:max-w-xl"
        showCloseButton={!isPending}
      >
        <SheetHeader>
          <SheetTitle>Private permissions</SheetTitle>
          <SheetDescription>
            Overlay for {userLabel}. Default follows the role; Allow adds a
            grant; Deny blocks even if the role has it.
          </SheetDescription>
        </SheetHeader>

        <form
          id="edit-user-permissions-form"
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col gap-3 px-4"
          noValidate
        >
          <Input
            type="search"
            placeholder="Find permission…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            disabled={isPending}
            aria-label="Find permission"
          />

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-2">
            {grouped.map((group) => (
              <section key={group.feature} className="space-y-2">
                <h3 className="text-sm font-medium">{group.label}</h3>
                <ul className="divide-y rounded-lg border">
                  {group.definitions.map((definition) => {
                    const effect = effects[definition.key] ?? "default";
                    const onRole = roleSet.has(definition.key);

                    return (
                      <li
                        key={definition.key}
                        className="flex flex-col gap-2 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {definition.label}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {definition.key}
                            {onRole ? " · on role" : ""}
                          </p>
                        </div>
                        <div
                          className="inline-flex rounded-lg border p-0.5"
                          role="group"
                          aria-label={`Effect for ${definition.label}`}
                        >
                          {(
                            [
                              ["default", "Default"],
                              ["allow", "Allow"],
                              ["deny", "Deny"],
                            ] as const
                          ).map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              disabled={isPending}
                              onClick={() => setEffect(definition.key, value)}
                              className={cn(
                                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                                effect === value
                                  ? value === "deny"
                                    ? "bg-destructive text-destructive-foreground"
                                    : value === "allow"
                                      ? "bg-emerald-600 text-white"
                                      : "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:bg-muted"
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </form>

        <SheetFooter className="border-t">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-user-permissions-form"
            disabled={isPending || !breakdown}
          >
            {isPending ? <InlineSpinner data-icon="inline-start" /> : null}
            Save overlay
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
