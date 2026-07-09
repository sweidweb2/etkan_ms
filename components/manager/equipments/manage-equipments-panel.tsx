"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  HandHelpingIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { AddEquipmentDialog } from "@/components/manager/equipments/add-equipment-dialog";
import { EditEquipmentDialog } from "@/components/manager/equipments/edit-equipment-dialog";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatEquipmentUnitPrice,
  getEquipmentRemainingQuantity,
} from "@/lib/constants/manager-equipment-display";
import { getManagerEquipmentDetailRoute, ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerEquipmentRow } from "@/types/manager-equipment";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const COLUMN_LIMITS = {
  name: 28,
  description: 36,
} as const;

function TruncatedCell({
  value,
  maxLength,
  className,
}: {
  value: string;
  maxLength: number;
  className?: string;
}) {
  const { display, isTruncated } = truncateText(value, maxLength);

  if (!isTruncated) {
    return <span className={cn("block truncate", className)}>{display}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn("block cursor-default truncate", className)}
            tabIndex={0}
          />
        }
      >
        {display}
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  );
}

function getPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);

  for (let offset = -1; offset <= 1; offset += 1) {
    const page = currentPage + offset;
    if (page > 1 && page < totalPages) {
      pages.add(page);
    }
  }

  const sortedPages = [...pages].sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];

  sortedPages.forEach((page, index) => {
    const previousPage = sortedPages[index - 1];
    if (previousPage !== undefined && page - previousPage > 1) {
      result.push("ellipsis");
    }
    result.push(page);
  });

  return result;
}

function matchesSearch(equipment: ManagerEquipmentRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [equipment.name, equipment.description ?? ""]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

export function ManageEquipmentsPanel({
  initialEquipments,
}: {
  initialEquipments: ManagerEquipmentRow[];
}) {
  const router = useRouter();
  const [equipments, setEquipments] =
    useState<ManagerEquipmentRow[]>(initialEquipments);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] =
    useState<ManagerEquipmentRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    10
  );
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setEquipments(initialEquipments);
  }, [initialEquipments]);

  const stats = useMemo(() => {
    const totalStock = equipments.reduce(
      (sum, equipment) => sum + equipment.quantity,
      0
    );
    const totalBorrowed = equipments.reduce(
      (sum, equipment) => sum + equipment.borrowed_quantity,
      0
    );
    const totalRemaining = equipments.reduce(
      (sum, equipment) => sum + getEquipmentRemainingQuantity(equipment),
      0
    );

    return {
      totalItems: equipments.length,
      totalStock,
      totalBorrowed,
      totalRemaining,
    };
  }, [equipments]);

  const filteredEquipments = useMemo(() => {
    return equipments.filter((equipment) =>
      matchesSearch(equipment, searchQuery)
    );
  }, [equipments, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEquipments.length / pageSize)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedEquipments = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredEquipments.slice(startIndex, startIndex + pageSize);
  }, [filteredEquipments, pageSize, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredEquipments.length === 0
      ? 0
      : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(
    safeCurrentPage * pageSize,
    filteredEquipments.length
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string | null) => {
    if (!value) {
      return;
    }

    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
    setCurrentPage(1);
  };

  const handleEquipmentChanged = () => {
    router.refresh();
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Manage equipment
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track inventory, borrowed units, and availability.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              render={<Link href={ROUTES.MANAGER_EQUIPMENT_BORROW} />}
              nativeButton={false}
              variant="outline"
            >
              <HandHelpingIcon data-icon="inline-start" />
              Borrow
            </Button>
            <Button type="button" onClick={() => setIsAddOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Add equipment
            </Button>
          </div>
        </div>

        <AddEquipmentDialog
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          onEquipmentCreated={handleEquipmentChanged}
        />

        <EditEquipmentDialog
          open={editingEquipment !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditingEquipment(null);
            }
          }}
          equipment={editingEquipment}
          onEquipmentUpdated={handleEquipmentChanged}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <UserStatCard
            label="Equipment types"
            value={stats.totalItems}
            accentClassName="border-l-sky-500"
          />
          <UserStatCard
            label="Total stock"
            value={stats.totalStock}
            accentClassName="border-l-violet-500"
          />
          <UserStatCard
            label="Currently borrowed"
            value={stats.totalBorrowed}
            accentClassName="border-l-amber-500"
          />
          <UserStatCard
            label="Available"
            value={stats.totalRemaining}
            accentClassName="border-l-emerald-500"
          />
        </div>

        <Card className="py-0">
          <CardHeader className="border-b py-3">
            <CardTitle>Equipment inventory</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="border-b px-4 pt-2 pb-3">
              <div className="relative max-w-md">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search name or description…"
                  className="pl-8"
                  aria-label="Search equipment"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium text-right">Quantity</th>
                    <th className="px-4 py-3 font-medium text-right">Borrowed</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Remaining
                    </th>
                    <th className="px-4 py-3 font-medium text-right">
                      Unit price
                    </th>
                    <th className="px-4 py-3 font-medium">Added</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEquipments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        No equipment matches your search.
                      </td>
                    </tr>
                  ) : (
                    paginatedEquipments.map((equipment) => {
                      const remaining = getEquipmentRemainingQuantity(equipment);

                      return (
                        <tr
                          key={equipment.id}
                          className="border-b last:border-b-0 hover:bg-muted/30"
                        >
                          <td className="max-w-[12rem] px-4 py-3 font-medium">
                            <TruncatedCell
                              value={equipment.name}
                              maxLength={COLUMN_LIMITS.name}
                            />
                          </td>
                          <td className="max-w-[14rem] px-4 py-3 text-muted-foreground">
                            <TruncatedCell
                              value={equipment.description ?? "—"}
                              maxLength={COLUMN_LIMITS.description}
                            />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                            {equipment.quantity}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                            {equipment.borrowed_quantity}
                          </td>
                          <td
                            className={cn(
                              "whitespace-nowrap px-4 py-3 text-right tabular-nums",
                              remaining === 0 && "text-amber-600 dark:text-amber-400"
                            )}
                          >
                            {remaining}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                            {formatEquipmentUnitPrice(equipment.unit_price)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                            {format(new Date(equipment.created_at), "MMM d, yyyy")}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Edit ${equipment.name}`}
                                onClick={() => setEditingEquipment(equipment)}
                              >
                                <PencilIcon />
                              </Button>
                              <Button
                                render={
                                  <Link
                                    href={getManagerEquipmentDetailRoute(
                                      equipment.id
                                    )}
                                  />
                                }
                                nativeButton={false}
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`View ${equipment.name}`}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <EyeIcon />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Showing {rangeStart}–{rangeEnd} of {filteredEquipments.length}
                </span>
                <span aria-hidden="true">·</span>
                <div className="flex items-center gap-2">
                  <span>Rows</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={handlePageSizeChange}
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-16"
                      aria-label="Rows per page"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((page) => page - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeftIcon />
                </Button>

                {pageNumbers.map((page, index) =>
                  page === "ellipsis" ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-1 text-sm text-muted-foreground"
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      key={page}
                      type="button"
                      variant={page === safeCurrentPage ? "default" : "outline"}
                      size="icon-sm"
                      className="min-w-7"
                      onClick={() => setCurrentPage(page)}
                      aria-label={`Page ${page}`}
                      aria-current={page === safeCurrentPage ? "page" : undefined}
                    >
                      {page}
                    </Button>
                  )
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((page) => page + 1)}
                  aria-label="Next page"
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
