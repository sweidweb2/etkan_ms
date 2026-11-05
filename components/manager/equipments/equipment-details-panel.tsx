"use client";

import { DetailField } from "@/components/manager/shared/detail-field";
import { useState } from "react";
import { format } from "date-fns";
import { PencilIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
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
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { ManagerEquipmentRow } from "@/types/manager-equipment";
import type { ManagerEquipmentBorrowRow } from "@/types/manager-equipment-borrow";

type EquipmentDetailsPanelProps = {
  equipment: ManagerEquipmentRow;
  initialBorrows: ManagerEquipmentBorrowRow[];
};


export function EquipmentDetailsPanel({
  equipment: initialEquipment,
  initialBorrows,
}: EquipmentDetailsPanelProps) {
  const [equipment, setEquipment] = useState(initialEquipment);
  const [prevEquipment, setPrevEquipment] = useState(initialEquipment);
  const [isEditOpen, setIsEditOpen] = useState(false);

  if (initialEquipment !== prevEquipment) {
    setPrevEquipment(initialEquipment);
    setEquipment(initialEquipment);
  }

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
        onEquipmentUpdated={(updated) => {
          setEquipment(updated);
        }}
      />

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 py-3">
          <CardTitle className="text-xl">{equipment.name}</CardTitle>
          <CardAction className="self-center">
            <Can permission={PERMISSIONS.EQUIPMENT_UPDATE}>
              <Button type="button" onClick={() => setIsEditOpen(true)}>
                <PencilIcon data-icon="inline-start" />
                Edit equipment
              </Button>
            </Can>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <dl className="grid gap-6 @lg/panel:grid-cols-2 @2xl/panel:grid-cols-3">
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
