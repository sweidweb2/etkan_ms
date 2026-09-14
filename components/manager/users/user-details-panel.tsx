"use client";

import { useState } from "react";
import { format } from "date-fns";
import { KeyRoundIcon, PencilIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { EditUserDialog } from "@/components/manager/users/edit-user-dialog";
import { EditUserPermissionsSheet } from "@/components/manager/users/edit-user-permissions-sheet";
import { UserPermissionsSection } from "@/components/manager/users/user-permissions-section";
import { UserRoleBadge } from "@/components/manager/users/user-role-badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import type { UserAccessBreakdown } from "@/services/auth/user-permissions.service";
import type { ManagerUserRow } from "@/types/manager-user";

type UserDetailsPanelProps = {
  user: ManagerUserRow;
  canManageOverlays: boolean;
  initialBreakdown: UserAccessBreakdown | null;
};

function DetailField({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{children ?? value ?? "—"}</dd>
    </div>
  );
}

export function UserDetailsPanel({
  user: initialUser,
  canManageOverlays,
  initialBreakdown,
}: UserDetailsPanelProps) {
  const [user, setUser] = useState(initialUser);
  const [breakdown, setBreakdown] = useState(initialBreakdown);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);

  const displayName = user.username ?? user.email;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_USERS}>
              Manage users
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{displayName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <EditUserDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        user={user}
        onUserUpdated={setUser}
      />

      {canManageOverlays && breakdown ? (
        <EditUserPermissionsSheet
          open={isPermissionsOpen}
          onOpenChange={setIsPermissionsOpen}
          userId={user.id}
          userLabel={displayName}
          breakdown={breakdown}
          onSaved={setBreakdown}
        />
      ) : null}

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-xl">{displayName}</CardTitle>
          <CardAction className="flex flex-wrap items-center gap-2 self-center">
            {canManageOverlays ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPermissionsOpen(true)}
                disabled={!breakdown}
              >
                <KeyRoundIcon data-icon="inline-start" />
                Permissions
              </Button>
            ) : null}
            <Can permission={PERMISSIONS.USERS_UPDATE}>
              <Button type="button" onClick={() => setIsEditOpen(true)}>
                <PencilIcon data-icon="inline-start" />
                Edit user
              </Button>
            </Can>
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField label="Username" value={user.username ?? "—"} />
            <DetailField label="Email" value={user.email} />
            <DetailField label="Role">
              <UserRoleBadge role={user.role} />
            </DetailField>
            <DetailField
              label="Created"
              value={format(
                new Date(user.created_at),
                "MMM d, yyyy 'at' h:mm a"
              )}
            />
            <DetailField label="User ID" value={user.id} />
          </dl>
        </CardContent>
      </Card>

      {canManageOverlays && breakdown ? (
        <UserPermissionsSection
          breakdown={breakdown}
          canEdit
          onEdit={() => setIsPermissionsOpen(true)}
        />
      ) : null}
    </div>
  );
}
