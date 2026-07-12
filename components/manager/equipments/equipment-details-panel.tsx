"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import { PencilIcon } from "lucide-react";
import { EditEquipmentDialog } from "@/components/manager/equipments/edit-equipment-dialog";
import { EquipmentBorrowsSection } from "@/components/manager/equipments/equipment-borrows-section";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatEquipmentUnitPrice,
  getEquipmentInventoryValue,
  getEquipmentRemainingQuantity,
} from "@/lib/constants/manager-equipment-display";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { ManagerEquipmentRow } from "@/types/manager-equipment";
import type { ManagerEquipmentBorrowRow } from "@/types/manager-equipment-borrow";

type EquipmentDetailsPanelProps = {
  equipment: ManagerEquipmentRow;
  initialBorrows: ManagerEquipmentBorrowRow[];
};

function DetailField({
  label,
  value,
  children,
  className,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={cn("text-sm text-foreground", className)}>
        {children ?? value ?? "—"}
      </dd>
    </div>
  );
}

export function EquipmentDetailsPanel({
  equipment,
  initialBorrows,
}: EquipmentDetailsPanelProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const remaining = getEquipmentRemainingQuantity(equipment);
  const inventoryValue = getEquipmentInventoryValue(equipment);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_EQUIPMENTS}>
              Manage equipment
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{equipment.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <EditEquipmentDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        equipment={equipment}
        onEquipmentUpdated={() => router.refresh()}
      />

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 py-3">
          <CardTitle className="text-xl">{equipment.name}</CardTitle>
          <CardAction className="self-center">
            <Button type="button" onClick={() => setIsEditOpen(true)}>
              <PencilIcon data-icon="inline-start" />
              Edit equipment
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField label="Name" value={equipment.name} />
            <DetailField label="Description" value={equipment.description ?? "—"} />
            <DetailField
              label="Quantity"
              value={String(equipment.quantity)}
              className="tabular-nums"
            />
            <DetailField
              label="Borrowed"
              value={String(equipment.borrowed_quantity)}
              className="tabular-nums"
            />
            <DetailField
              label="Remaining"
              value={String(remaining)}
              className={cn(
                "tabular-nums",
                remaining === 0 && "text-amber-600 dark:text-amber-400"
              )}
            />
            <DetailField
              label="Unit price"
              value={formatEquipmentUnitPrice(equipment.unit_price)}
              className="tabular-nums"
            />
            <DetailField
              label="Inventory value"
              value={formatEquipmentUnitPrice(inventoryValue)}
              className="tabular-nums"
            />
            <DetailField
              label="Added"
              value={format(
                new Date(equipment.created_at),
                "MMM d, yyyy 'at' h:mm a"
              )}
            />
          </dl>
        </CardContent>
      </Card>

      <EquipmentBorrowsSection
        equipmentName={equipment.name}
        initialBorrows={initialBorrows}
      />
    </div>
  );
}
