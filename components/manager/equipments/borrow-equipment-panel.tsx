"use client";

import {
  useActionState,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, MinusIcon, PlusIcon, SearchIcon } from "lucide-react";
import { createBorrowsAction } from "@/app/manager/equipments/actions";
import { Can } from "@/components/auth/can";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BorrowEquipmentHistorySection } from "@/components/manager/equipments/borrow-equipment-history-section";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import {
  formatEquipmentUnitPrice,
  exceedsEquipmentRemainingStock,
  getEquipmentRemainingQuantity,
  getMaxBorrowQuantityPerStudent,
} from "@/lib/constants/manager-equipment-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import { showErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type {
  CreateBorrowsActionState,
  ManagerBorrowClassOption,
  ManagerBorrowEquipmentListRow,
} from "@/types/manager-borrow-equipment-list";
import type { ManagerEquipmentRow } from "@/types/manager-equipment";
import type { ManagerStudentRow } from "@/types/manager-student";

const CLASS_FILTER_ALL = "all";
const TABLE_PAGE_SIZE = 10;

const initialBorrowState: CreateBorrowsActionState = {};

type BorrowEquipmentPanelProps = {
  initialStudents: ManagerStudentRow[];
  initialEquipments: ManagerEquipmentRow[];
  initialClasses: ManagerBorrowClassOption[];
  initialClassStudentProfileIds: Record<string, string[]>;
  initialBorrowHistory: ManagerBorrowEquipmentListRow[];
};

function toggleSetMember(
  set: Set<string>,
  id: string,
  checked: boolean
): Set<string> {
  const next = new Set(set);
  if (checked) {
    next.add(id);
  } else {
    next.delete(id);
  }
  return next;
}

function matchesStudentSearch(student: ManagerStudentRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    student.full_name,
    student.username ?? "",
    student.email,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function matchesEquipmentSearch(equipment: ManagerEquipmentRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [equipment.name, equipment.description ?? ""]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function SelectionCheckbox({
  checked,
  onCheckedChange,
  ariaLabel,
  onClick,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabel: string;
  onClick?: (event: MouseEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onClick={onClick}
      onChange={(event) => onCheckedChange(event.target.checked)}
      aria-label={ariaLabel}
      className="size-4 shrink-0 rounded border border-input accent-primary"
    />
  );
}

function QuantityStepper({
  value,
  max,
  disabled,
  onDecrease,
  onIncrease,
  ariaLabel,
}: {
  value: number;
  max: number;
  disabled?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  ariaLabel: string;
}) {
  return (
    <div
      className="flex items-center justify-end gap-1"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={`Decrease ${ariaLabel}`}
        disabled={disabled || value <= 1}
        onClick={onDecrease}
      >
        <MinusIcon />
      </Button>
      <span className="w-7 text-center text-sm font-medium tabular-nums">
        {value}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={`Increase ${ariaLabel}`}
        disabled={disabled || value >= max}
        onClick={onIncrease}
      >
        <PlusIcon />
      </Button>
    </div>
  );
}

function stopRowToggle(event: MouseEvent | KeyboardEvent) {
  event.stopPropagation();
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

function TablePaginationFooter({
  currentPage,
  totalItems,
  onPageChange,
}: {
  currentPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / TABLE_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const rangeStart =
    totalItems === 0 ? 0 : (safeCurrentPage - 1) * TABLE_PAGE_SIZE + 1;
  const rangeEnd = Math.min(safeCurrentPage * TABLE_PAGE_SIZE, totalItems);
  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);

  if (totalItems <= TABLE_PAGE_SIZE) {
    return (
      <div className="border-t px-4 pt-2 pb-3 text-sm text-muted-foreground">
        Showing {totalItems} {totalItems === 1 ? "row" : "rows"}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">
        Showing {rangeStart}–{rangeEnd} of {totalItems}
      </span>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={safeCurrentPage <= 1}
          onClick={() => onPageChange(safeCurrentPage - 1)}
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
              onClick={() => onPageChange(page)}
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
          onClick={() => onPageChange(safeCurrentPage + 1)}
          aria-label="Next page"
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}

export function BorrowEquipmentPanel({
  initialStudents,
  initialEquipments,
  initialClasses,
  initialClassStudentProfileIds,
  initialBorrowHistory,
}: BorrowEquipmentPanelProps) {
  const router = useRouter();
  const equipmentSectionRef = useRef<HTMLDivElement>(null);
  const borrowHistorySectionRef = useRef<HTMLDivElement>(null);
  const [isTransitionPending, startTransition] = useTransition();
  const [state, formAction, isActionPending] = useActionState(
    createBorrowsAction,
    initialBorrowState
  );
  const isPending = isActionPending || isTransitionPending;

  useActionStateToast(state, isPending);

  const students = initialStudents;
  const equipments = initialEquipments;
  const borrowHistory = initialBorrowHistory;

  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    () => new Set()
  );
  const [equipmentQuantities, setEquipmentQuantities] = useState<
    Record<string, number>
  >({});
  const [classFilter, setClassFilter] = useState(CLASS_FILTER_ALL);
  const [studentSearch, setStudentSearch] = useState("");
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [studentCurrentPage, setStudentCurrentPage] = useState(1);
  const [equipmentCurrentPage, setEquipmentCurrentPage] = useState(1);

  useActionStateSuccess(state, isPending, () => {
    setSelectedStudentIds(new Set());
    setEquipmentQuantities({});
    setClassFilter(CLASS_FILTER_ALL);
    router.refresh();
  });

  const studentCount = selectedStudentIds.size;
  const [prevStudentCount, setPrevStudentCount] = useState(studentCount);

  if (studentCount !== prevStudentCount) {
    setPrevStudentCount(studentCount);

    if (studentCount > 0) {
      setEquipmentQuantities((current) => {
        let changed = false;
        const next = { ...current };

        for (const [equipmentId, quantity] of Object.entries(current)) {
          const equipment = equipments.find((row) => row.id === equipmentId);
          if (!equipment) {
            continue;
          }

          const maxQuantity = getMaxBorrowQuantityPerStudent(
            equipment,
            studentCount
          );

          if (maxQuantity === 0) {
            delete next[equipmentId];
            changed = true;
            continue;
          }

          if (quantity > maxQuantity) {
            next[equipmentId] = maxQuantity;
            changed = true;
          }
        }

        return changed ? next : current;
      });
    }
  }

  const selectedEquipmentIds = useMemo(
    () => new Set(Object.keys(equipmentQuantities)),
    [equipmentQuantities]
  );

  const selectedEquipmentsList = useMemo(() => {
    return equipments.filter((equipment) =>
      selectedEquipmentIds.has(equipment.id)
    );
  }, [equipments, selectedEquipmentIds]);

  const hasInsufficientStockForSave = useMemo(() => {
    if (studentCount === 0 || selectedEquipmentsList.length === 0) {
      return false;
    }

    return selectedEquipmentsList.some((equipment) =>
      exceedsEquipmentRemainingStock(
        equipment,
        studentCount,
        equipmentQuantities[equipment.id] ?? 1
      )
    );
  }, [equipmentQuantities, selectedEquipmentsList, studentCount]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) =>
      matchesStudentSearch(student, studentSearch)
    );
  }, [studentSearch, students]);

  const filteredEquipments = useMemo(() => {
    return equipments.filter((equipment) =>
      matchesEquipmentSearch(equipment, equipmentSearch)
    );
  }, [equipmentSearch, equipments]);

  const studentTotalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / TABLE_PAGE_SIZE)
  );
  const equipmentTotalPages = Math.max(
    1,
    Math.ceil(filteredEquipments.length / TABLE_PAGE_SIZE)
  );
  const safeStudentCurrentPage = Math.min(studentCurrentPage, studentTotalPages);
  const safeEquipmentCurrentPage = Math.min(
    equipmentCurrentPage,
    equipmentTotalPages
  );

  const paginatedStudents = useMemo(() => {
    const startIndex = (safeStudentCurrentPage - 1) * TABLE_PAGE_SIZE;
    return filteredStudents.slice(startIndex, startIndex + TABLE_PAGE_SIZE);
  }, [filteredStudents, safeStudentCurrentPage]);

  const paginatedEquipments = useMemo(() => {
    const startIndex = (safeEquipmentCurrentPage - 1) * TABLE_PAGE_SIZE;
    return filteredEquipments.slice(startIndex, startIndex + TABLE_PAGE_SIZE);
  }, [filteredEquipments, safeEquipmentCurrentPage]);

  const allFilteredStudentsSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((student) =>
      selectedStudentIds.has(student.student_profile_id)
    );

  const allFilteredEquipmentsSelected =
    filteredEquipments.length > 0 &&
    filteredEquipments.every((equipment) =>
      selectedEquipmentIds.has(equipment.id)
    );

  const handleClassFilterChange = (value: string | null) => {
    const nextClass = value ?? CLASS_FILTER_ALL;
    setClassFilter(nextClass);

    if (nextClass === CLASS_FILTER_ALL) {
      return;
    }

    const classStudentIds = initialClassStudentProfileIds[nextClass] ?? [];

    if (classStudentIds.length === 0) {
      showErrorToast("No students are enrolled in this class.");
      return;
    }

    setSelectedStudentIds((current) => {
      const next = new Set(current);
      for (const studentProfileId of classStudentIds) {
        next.add(studentProfileId);
      }
      return next;
    });
  };

  const handleToggleStudent = (studentProfileId: string) => {
    setSelectedStudentIds((current) =>
      toggleSetMember(current, studentProfileId, !current.has(studentProfileId))
    );
  };

  const handleToggleAllStudents = (checked: boolean) => {
    setSelectedStudentIds((current) => {
      const next = new Set(current);
      for (const student of filteredStudents) {
        if (checked) {
          next.add(student.student_profile_id);
        } else {
          next.delete(student.student_profile_id);
        }
      }
      return next;
    });
  };

  const handleToggleAllEquipments = (checked: boolean) => {
    setEquipmentQuantities((current) => {
      if (!checked) {
        const next = { ...current };
        for (const equipment of filteredEquipments) {
          delete next[equipment.id];
        }
        return next;
      }

      const next = { ...current };
      for (const equipment of filteredEquipments) {
        const maxQuantity = getMaxBorrowQuantityPerStudent(
          equipment,
          Math.max(studentCount, 1)
        );
        if (maxQuantity > 0) {
          next[equipment.id] = Math.min(next[equipment.id] ?? 1, maxQuantity);
        }
      }
      return next;
    });
  };

  const handleEquipmentToggle = (equipmentId: string, checked: boolean) => {
    setEquipmentQuantities((current) => {
      const next = { ...current };
      if (checked) {
        const equipment = equipments.find((row) => row.id === equipmentId);
        if (!equipment) {
          return current;
        }

        const maxQuantity = getMaxBorrowQuantityPerStudent(
          equipment,
          Math.max(studentCount, 1)
        );
        if (maxQuantity === 0) {
          return current;
        }

        next[equipmentId] = Math.min(current[equipmentId] ?? 1, maxQuantity);
      } else {
        delete next[equipmentId];
      }
      return next;
    });
  };

  const handleToggleEquipment = (equipmentId: string) => {
    handleEquipmentToggle(equipmentId, !selectedEquipmentIds.has(equipmentId));
  };

  const getMaxQuantityPerStudent = (equipment: ManagerEquipmentRow) => {
    return getMaxBorrowQuantityPerStudent(
      equipment,
      Math.max(studentCount, 1)
    );
  };

  const handleEquipmentQuantityChange = (
    equipmentId: string,
    delta: number
  ) => {
    const equipment = equipments.find((row) => row.id === equipmentId);
    if (!equipment) {
      return;
    }

    setEquipmentQuantities((current) => {
      const currentQuantity = current[equipmentId] ?? 1;
      const maxQuantity = getMaxQuantityPerStudent(equipment);
      if (maxQuantity === 0) {
        return current;
      }

      const nextQuantity = Math.min(
        maxQuantity,
        Math.max(1, currentQuantity + delta)
      );

      return {
        ...current,
        [equipmentId]: nextQuantity,
      };
    });
  };

  const handleClearAllStudents = () => {
    setSelectedStudentIds(new Set());
  };

  const handleClearAllEquipments = () => {
    setEquipmentQuantities({});
  };

  const handleScrollToEquipment = () => {
    equipmentSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleScrollToBorrowingRecords = () => {
    borrowHistorySectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleSaveBorrow = () => {
    if (selectedStudentIds.size === 0) {
      showErrorToast("Select at least one student.");
      return;
    }

    if (selectedEquipmentIds.size === 0) {
      showErrorToast("Select at least one equipment item.");
      return;
    }

    const selectedEquipments = selectedEquipmentsList;
    const selectedStudentsList = students.filter((student) =>
      selectedStudentIds.has(student.student_profile_id)
    );
    const studentCount = selectedStudentIds.size;

    const insufficientStock = selectedEquipments.find((equipment) =>
      exceedsEquipmentRemainingStock(
        equipment,
        studentCount,
        equipmentQuantities[equipment.id] ?? 1
      )
    );

    if (insufficientStock) {
      const borrowQuantity = equipmentQuantities[insufficientStock.id] ?? 1;
      showErrorToast(
        `Not enough stock for ${insufficientStock.name}. ${getEquipmentRemainingQuantity(insufficientStock)} available for ${studentCount} student${studentCount === 1 ? "" : "s"} at ${borrowQuantity} each.`
      );
      return;
    }

    const items = selectedStudentsList.flatMap((student) =>
      selectedEquipments.map((equipment) => ({
        user_id: student.user_id,
        equipment_id: equipment.id,
        quantity: equipmentQuantities[equipment.id] ?? 1,
      }))
    );

    const formData = new FormData();
    formData.set("items", JSON.stringify(items));

    startTransition(() => {
      formAction(formData);
    });
  };

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
            <BreadcrumbPage>Borrow equipment</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Borrow equipment
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select one or more students and equipment items, then save the borrow.
        </p>
      </div>

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <CardTitle>Students</CardTitle>
          <CardDescription>
            Choose individual students or pick a class to select everyone enrolled
            in it.
          </CardDescription>
          <CardAction className="self-center">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button type="button" onClick={handleScrollToEquipment}>
                Continue to equipment
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleScrollToBorrowingRecords}
              >
                View borrowing records
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="flex flex-col gap-3 border-b px-4 pt-2 pb-3 lg:flex-row lg:items-end">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={studentSearch}
                onChange={(event) => {
                  setStudentSearch(event.target.value);
                  setStudentCurrentPage(1);
                }}
                placeholder="Search student name, username, or email…"
                className="pl-8"
                aria-label="Search students"
              />
            </div>
            <div className="w-full lg:w-72">
              <Select
                value={classFilter}
                onValueChange={handleClassFilterChange}
              >
                <SelectTrigger
                  id="borrow-class-filter"
                  className="w-full"
                  aria-label="Select class to add students"
                >
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={CLASS_FILTER_ALL}>
                    No class shortcut
                  </SelectItem>
                  {initialClasses.map((classOption) => (
                    <SelectItem key={classOption.id} value={classOption.id}>
                      {classOption.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-2">
            <span className="text-sm text-muted-foreground">
              {selectedStudentIds.size} student
              {selectedStudentIds.size === 1 ? "" : "s"} selected
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={selectedStudentIds.size === 0}
              onClick={handleClearAllStudents}
            >
              Unselect all
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="w-12 px-4 py-3">
                    <SelectionCheckbox
                      checked={allFilteredStudentsSelected}
                      onCheckedChange={handleToggleAllStudents}
                      ariaLabel="Select all matching students"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Full name</th>
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No students match your search.
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student) => {
                    const isSelected = selectedStudentIds.has(
                      student.student_profile_id
                    );

                    return (
                      <tr
                        key={student.student_profile_id}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onClick={() =>
                          handleToggleStudent(student.student_profile_id)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleToggleStudent(student.student_profile_id);
                          }
                        }}
                        className={cn(
                          "cursor-pointer border-b last:border-b-0 hover:bg-muted/30",
                          isSelected && "bg-primary/5"
                        )}
                      >
                        <td className="px-4 py-3" onClick={stopRowToggle}>
                          <SelectionCheckbox
                            checked={isSelected}
                            onClick={stopRowToggle}
                            onCheckedChange={(checked) => {
                              setSelectedStudentIds((current) =>
                                toggleSetMember(
                                  current,
                                  student.student_profile_id,
                                  checked
                                )
                              );
                            }}
                            ariaLabel={`Select ${student.full_name}`}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {student.full_name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {student.username ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {student.email}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <TablePaginationFooter
            currentPage={safeStudentCurrentPage}
            totalItems={filteredStudents.length}
            onPageChange={setStudentCurrentPage}
          />
        </CardContent>
      </Card>

      <Card ref={equipmentSectionRef} className="scroll-mt-6 py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <CardTitle>Equipment</CardTitle>
          <CardDescription>
            Select one or more items to borrow for the chosen students.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="border-b px-4 pt-2 pb-3">
            <div className="relative max-w-md">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={equipmentSearch}
                onChange={(event) => {
                  setEquipmentSearch(event.target.value);
                  setEquipmentCurrentPage(1);
                }}
                placeholder="Search equipment name or description…"
                className="pl-8"
                aria-label="Search equipment"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-4 py-2">
            <span className="text-sm text-muted-foreground">
              {selectedEquipmentIds.size} equipment item
              {selectedEquipmentIds.size === 1 ? "" : "s"} selected
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={selectedEquipmentIds.size === 0}
              onClick={handleClearAllEquipments}
            >
              Unselect all
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="w-12 px-4 py-3">
                    <SelectionCheckbox
                      checked={allFilteredEquipmentsSelected}
                      onCheckedChange={handleToggleAllEquipments}
                      ariaLabel="Select all matching equipment"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium text-right">Quantity</th>
                  <th className="px-4 py-3 font-medium text-right">Borrowed</th>
                  <th className="px-4 py-3 font-medium text-right">Remaining</th>
                  <th className="px-4 py-3 font-medium text-right">
                    Unit price
                  </th>
                  <th className="px-4 py-3 font-medium text-right">
                    Borrow qty
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEquipments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No equipment matches your search.
                    </td>
                  </tr>
                ) : (
                  paginatedEquipments.map((equipment) => {
                    const isSelected = selectedEquipmentIds.has(equipment.id);
                    const remaining = getEquipmentRemainingQuantity(equipment);
                    const maxQuantity = getMaxQuantityPerStudent(equipment);
                    const isOutOfStock =
                      remaining === 0 ||
                      (studentCount > 0 && maxQuantity === 0);
                    const quantity = equipmentQuantities[equipment.id] ?? 1;

                    return (
                      <tr
                        key={equipment.id}
                        role="button"
                        tabIndex={isOutOfStock ? -1 : 0}
                        aria-pressed={isSelected}
                        aria-disabled={isOutOfStock}
                        onClick={() => {
                          if (!isOutOfStock) {
                            handleToggleEquipment(equipment.id);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (isOutOfStock) {
                            return;
                          }

                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleToggleEquipment(equipment.id);
                          }
                        }}
                        className={cn(
                          "border-b last:border-b-0 hover:bg-muted/30",
                          !isOutOfStock && "cursor-pointer",
                          isSelected && "bg-primary/5",
                          isOutOfStock && "opacity-60"
                        )}
                      >
                        <td className="px-4 py-3" onClick={stopRowToggle}>
                          <SelectionCheckbox
                            checked={isSelected}
                            onClick={stopRowToggle}
                            onCheckedChange={(checked) => {
                              handleEquipmentToggle(equipment.id, checked);
                            }}
                            ariaLabel={`Select ${equipment.name}`}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {equipment.name}
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
                            isOutOfStock &&
                              "text-amber-600 dark:text-amber-400"
                          )}
                        >
                          {remaining}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {formatEquipmentUnitPrice(equipment.unit_price)}
                        </td>
                        <td className="px-4 py-3">
                          {isSelected ? (
                            <QuantityStepper
                              value={quantity}
                              max={maxQuantity}
                              ariaLabel={`borrow quantity for ${equipment.name}`}
                              onDecrease={() =>
                                handleEquipmentQuantityChange(equipment.id, -1)
                              }
                              onIncrease={() =>
                                handleEquipmentQuantityChange(equipment.id, 1)
                              }
                            />
                          ) : (
                            <span className="block text-right text-xs text-muted-foreground">
                              Select row
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <TablePaginationFooter
            currentPage={safeEquipmentCurrentPage}
            totalItems={filteredEquipments.length}
            onPageChange={setEquipmentCurrentPage}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Can permission={PERMISSIONS.EQUIPMENT_BORROW_CREATE}>
          <Button
            type="button"
            onClick={handleSaveBorrow}
            disabled={isPending || hasInsufficientStockForSave}
            className="bg-orange-500 text-white hover:bg-orange-500/90"
          >
            {isPending ? (
              <InlineSpinner />
            ) : (
              "Save borrow"
            )}
          </Button>
        </Can>
      </div>

      <div ref={borrowHistorySectionRef} className="scroll-mt-6">
        <BorrowEquipmentHistorySection
          borrows={borrowHistory}
          equipments={equipments}
          onRecordsChanged={() => router.refresh()}
        />
      </div>
    </div>
  );
}
