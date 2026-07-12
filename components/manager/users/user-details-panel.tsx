"use client";

import { useState } from "react";
import { format } from "date-fns";
import { PencilIcon } from "lucide-react";
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
import { MANAGER_USER_PREVIEW_ID } from "@/lib/constants/manager-users-mock";
import { getManagerUserPreview } from "@/lib/manager/get-manager-user-preview";
import { ROUTES } from "@/lib/constants/routes";
import type { ManagerUserRow } from "@/types/manager-user";

type UserDetailsPanelProps = {
  userId: string;
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
      <dd className="text-sm text-foreground">
        {children ?? value ?? "—"}
      </dd>
    </div>
  );
}

export function UserDetailsPanel({ userId }: UserDetailsPanelProps) {
  void userId;
  const [user, setUser] = useState<ManagerUserRow>(() =>
    getManagerUserPreview(MANAGER_USER_PREVIEW_ID)
  );
  const [isEditOpen, setIsEditOpen] = useState(false);

  const displayName = user.username ?? user.email;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_USERS}>Manage users</BreadcrumbLink>
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
        onUpdateUser={setUser}
      />

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-xl">{displayName}</CardTitle>
          <CardAction className="self-center">
            <Button type="button" onClick={() => setIsEditOpen(true)}>
              <PencilIcon data-icon="inline-start" />
              Edit user
            </Button>
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
              value={format(new Date(user.created_at), "MMM d, yyyy 'at' h:mm a")}
            />
            <DetailField label="User ID" value={user.id} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
