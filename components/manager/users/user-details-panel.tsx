"use client";

import { DetailField } from "@/components/manager/shared/detail-field";
import { useState } from "react";
import { format } from "date-fns";
import { PencilIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { EditUserDialog } from "@/components/manager/users/edit-user-dialog";
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
import type { ManagerUserRow } from "@/types/manager-user";

type UserDetailsPanelProps = {
  user: ManagerUserRow;
};


export function UserDetailsPanel({
  user: initialUser,
}: UserDetailsPanelProps) {
  const [user, setUser] = useState(initialUser);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const displayName = user.full_name || user.email;

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

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-xl">{displayName}</CardTitle>
          <CardAction className="flex flex-wrap items-center gap-2 self-center">
            <Can permission={PERMISSIONS.USERS_UPDATE}>
              <Button type="button" onClick={() => setIsEditOpen(true)}>
                <PencilIcon data-icon="inline-start" />
                Edit user
              </Button>
            </Can>
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-6 @lg/panel:grid-cols-2 @2xl/panel:grid-cols-3">
            <DetailField label="Full name" value={user.full_name || "—"} />
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
    </div>
  );
}
