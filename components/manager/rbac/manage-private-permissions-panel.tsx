"use client";

import { useMemo, useState } from "react";
import { KeyRoundIcon, SearchIcon } from "lucide-react";
import { getUserAccessBreakdownAction } from "@/app/manager/users/actions";
import { EditUserPermissionsSheet } from "@/components/manager/users/edit-user-permissions-sheet";
import { RbacSectionNav } from "@/components/manager/rbac/rbac-section-nav";
import { UserRoleBadge } from "@/components/manager/users/user-role-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MANAGER_USER_ROLE_LABELS } from "@/lib/constants/manager-user-display";
import { showErrorToast } from "@/lib/toast";
import type { PrivatePermissionUserSummary } from "@/services/auth/user-permissions.service";
import type { UserAccessBreakdown } from "@/services/auth/user-permissions.service";
import type { ManagerUserRow } from "@/types/manager-user";

type ManagePrivatePermissionsPanelProps = {
  users: ManagerUserRow[];
  summaries: PrivatePermissionUserSummary[];
  canManageOverlays: boolean;
};

export function ManagePrivatePermissionsPanel({
  users,
  summaries,
  canManageOverlays,
}: ManagePrivatePermissionsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyWithOverlay, setShowOnlyWithOverlay] = useState(false);
  const [permissionsUser, setPermissionsUser] =
    useState<ManagerUserRow | null>(null);
  const [breakdown, setBreakdown] = useState<UserAccessBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [summaryByUserId, setSummaryByUserId] = useState(() => {
    const map = new Map<string, PrivatePermissionUserSummary>();
    for (const row of summaries) {
      map.set(row.userId, row);
    }
    return map;
  });

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((user) => {
      const summary = summaryByUserId.get(user.id);
      if (showOnlyWithOverlay && (!summary || summary.overlayCount === 0)) {
        return false;
      }
      if (!q) {
        return true;
      }
      const username = user.username?.toLowerCase() ?? "";
      const email = user.email.toLowerCase();
      const roleLabel =
        MANAGER_USER_ROLE_LABELS[user.role]?.toLowerCase() ?? user.role;
      return (
        username.includes(q) || email.includes(q) || roleLabel.includes(q)
      );
    });
  }, [users, searchQuery, showOnlyWithOverlay, summaryByUserId]);

  async function openEditor(user: ManagerUserRow) {
    if (!canManageOverlays) {
      return;
    }
    setIsLoading(true);
    try {
      const result = await getUserAccessBreakdownAction(user.id);
      if (!result.success) {
        showErrorToast(result.error);
        return;
      }
      setBreakdown(result.breakdown);
      setPermissionsUser(user);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSaved(next: UserAccessBreakdown) {
    setBreakdown(next);
    setSummaryByUserId((prev) => {
      const map = new Map(prev);
      const allowCount = next.overlayRows.filter(
        (row) => row.effect === "allow"
      ).length;
      const denyCount = next.overlayRows.filter(
        (row) => row.effect === "deny"
      ).length;
      if (allowCount + denyCount === 0) {
        map.delete(next.userId);
      } else {
        map.set(next.userId, {
          userId: next.userId,
          allowCount,
          denyCount,
          overlayCount: allowCount + denyCount,
        });
      }
      return map;
    });
  }

  const usersWithOverlay = summaryByUserId.size;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Manage private
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign per-user allow/deny overlays on top of role grants. Effective
          access = role ∪ allow − deny.
        </p>
      </div>

      <RbacSectionNav />

      {!canManageOverlays ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Only the manager role can edit private permission overlays (also
            requires <span className="font-mono">rbac.manage</span>).
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Users
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold tabular-nums">
                {users.length}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  With private overlays
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold tabular-nums">
                {usersWithOverlay}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Showing
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold tabular-nums">
                {filteredUsers.length}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Search username, email, or role…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
                aria-label="Search users"
              />
            </div>
            <label className="flex items-center gap-2 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={showOnlyWithOverlay}
                onChange={(event) =>
                  setShowOnlyWithOverlay(event.target.checked)
                }
              />
              Only with private overlays
            </label>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">User</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Private</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No users match this filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const summary = summaryByUserId.get(user.id);
                    return (
                      <tr key={user.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {user.username ?? "—"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <UserRoleBadge role={user.role} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {summary && summary.overlayCount > 0 ? (
                            <span>
                              {summary.overlayCount} (
                              {summary.allowCount} allow
                              {summary.denyCount > 0
                                ? `, ${summary.denyCount} deny`
                                : ""}
                              )
                            </span>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isLoading}
                            onClick={() => void openEditor(user)}
                          >
                            <KeyRoundIcon data-icon="inline-start" />
                            Edit private
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {permissionsUser && breakdown ? (
            <EditUserPermissionsSheet
              open
              onOpenChange={(open) => {
                if (!open) {
                  setPermissionsUser(null);
                  setBreakdown(null);
                }
              }}
              userId={permissionsUser.id}
              userLabel={permissionsUser.username ?? permissionsUser.email}
              breakdown={breakdown}
              onSaved={handleSaved}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
