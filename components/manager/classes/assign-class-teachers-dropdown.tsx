"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ChevronDownIcon, UserPlusIcon } from "lucide-react";
import {
  assignClassTeacherAction,
  loadClassTeacherOptionsAction,
  unassignClassTeacherAction,
} from "@/app/manager/classes/actions";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { cn } from "@/lib/utils";
import type {
  AssignClassTeacherActionState,
  ManagerClassTeacherOption,
  UnassignClassTeacherActionState,
} from "@/types/manager-class-detail";
import type { ManagerClassRow } from "@/types/manager-class-list";

const initialAssignState: AssignClassTeacherActionState = {};
const initialUnassignState: UnassignClassTeacherActionState = {};

type AssignClassTeachersDropdownProps = {
  classId: string;
  teachers: ManagerClassTeacherOption[];
  onTeachersChange: (
    next:
      | ManagerClassTeacherOption[]
      | ((current: ManagerClassTeacherOption[]) => ManagerClassTeacherOption[])
  ) => void;
  onClassUpdated: (classRow: ManagerClassRow) => void;
};

export function AssignClassTeachersDropdown({
  classId,
  teachers,
  onTeachersChange,
  onClassUpdated,
}: AssignClassTeachersDropdownProps) {
  const [isTransitionPending, startTransition] = useTransition();
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [assignState, assignAction, isAssignPending] = useActionState(
    assignClassTeacherAction,
    initialAssignState
  );
  const [unassignState, unassignAction, isUnassignPending] = useActionState(
    unassignClassTeacherAction,
    initialUnassignState
  );

  const handledAssignKeyRef = useRef<string | null>(null);
  const handledUnassignKeyRef = useRef<string | null>(null);

  const isPending =
    isTransitionPending ||
    isAssignPending ||
    isUnassignPending ||
    isCatalogLoading;

  useActionStateToast(assignState, isAssignPending || isTransitionPending);
  useActionStateToast(unassignState, isUnassignPending || isTransitionPending);

  useEffect(() => {
    if (!assignState.success || !assignState.teacher || !assignState.classRow) {
      return;
    }

    const key = `${assignState.teacher.id}:${assignState.teacher.assignment_id}`;
    if (handledAssignKeyRef.current === key) {
      return;
    }
    handledAssignKeyRef.current = key;

    const updatedTeacher = assignState.teacher;
    onTeachersChange((current) =>
      current.map((teacher) =>
        teacher.id === updatedTeacher.id ? updatedTeacher : teacher
      )
    );
    onClassUpdated(assignState.classRow);
  }, [assignState, onTeachersChange, onClassUpdated]);

  useEffect(() => {
    if (
      !unassignState.success ||
      !unassignState.teacherId ||
      !unassignState.classRow
    ) {
      return;
    }

    const key = `${unassignState.teacherId}:${unassignState.message ?? ""}`;
    if (handledUnassignKeyRef.current === key) {
      return;
    }
    handledUnassignKeyRef.current = key;

    const teacherId = unassignState.teacherId;
    onTeachersChange((current) =>
      current.map((teacher) =>
        teacher.id === teacherId
          ? { ...teacher, assigned: false, assignment_id: null }
          : teacher
      )
    );
    onClassUpdated(unassignState.classRow);
  }, [unassignState, onTeachersChange, onClassUpdated]);

  const assignedCount = teachers.filter((teacher) => teacher.assigned).length;

  function handleOpenChange(open: boolean) {
    if (!open || catalogLoaded || isCatalogLoading) {
      return;
    }

    setIsCatalogLoading(true);
    void loadClassTeacherOptionsAction(classId)
      .then((rows) => {
        onTeachersChange(rows);
        setCatalogLoaded(true);
      })
      .finally(() => {
        setIsCatalogLoading(false);
      });
  }

  function handleToggle(teacher: ManagerClassTeacherOption) {
    const formData = new FormData();
    formData.set("class_id", classId);
    formData.set("teacher_id", teacher.id);

    startTransition(() => {
      if (teacher.assigned) {
        unassignAction(formData);
      } else {
        assignAction(formData);
      }
    });
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        disabled={isAssignPending || isUnassignPending || isTransitionPending}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        )}
      >
        {isPending ? (
          <InlineSpinner className="mr-1.5" />
        ) : (
          <UserPlusIcon data-icon="inline-start" />
        )}
        Teachers
        {assignedCount > 0 ? (
          <span className="ml-1 rounded-md bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
            {assignedCount}
          </span>
        ) : null}
        <ChevronDownIcon className="ml-0.5 size-4 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Assign teachers</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isCatalogLoading && !catalogLoaded ? (
          <p className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
            <InlineSpinner />
            Loading instructors…
          </p>
        ) : teachers.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            No instructors available.
          </p>
        ) : (
          teachers.map((teacher) => {
            const name = teacher.username?.trim() || "Unnamed user";
            return (
              <DropdownMenuCheckboxItem
                key={teacher.id}
                checked={teacher.assigned}
                disabled={isPending}
                onCheckedChange={() => handleToggle(teacher)}
                onSelect={(event) => event.preventDefault()}
              >
                <span className="truncate">{name}</span>
              </DropdownMenuCheckboxItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
