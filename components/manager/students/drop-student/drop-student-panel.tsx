"use client";

import { useCallback, useState, useTransition } from "react";
import { loadDropStudentConsoleSnapshotAction } from "@/app/manager/students/actions/drop-student-console";
import { DeleteDropRefundPaymentDialog } from "@/components/manager/accounting/delete-drop-refund-payment-dialog";
import { ProcessDropRefundDialog } from "@/components/manager/accounting/process-drop-refund-dialog";
import { WaiveDropRefundDialog } from "@/components/manager/accounting/waive-drop-refund-dialog";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { ActivateInactivateStudentDialog } from "@/components/manager/students/activate-inactivate-student-dialog";
import type { DropStudentActionOption } from "@/components/manager/students/drop-student/drop-student-actions";
import { DropStudentActionBar } from "@/components/manager/students/drop-student/drop-student-action-bar";
import { DropStudentBetaCard } from "@/components/manager/students/drop-student/drop-student-beta-card";
import { DropStudentDropAllDialog } from "@/components/manager/students/drop-student/drop-student-drop-all-dialog";
import { DropStudentDropDialog } from "@/components/manager/students/drop-student/drop-student-drop-dialog";
import { DropStudentHotRow } from "@/components/manager/students/drop-student/drop-student-hot-row";
import { DropStudentRemoveDialog } from "@/components/manager/students/drop-student/drop-student-remove-dialog";
import { DropStudentSearch } from "@/components/manager/students/drop-student/drop-student-search";
import { DropStudentStopPendingDialog } from "@/components/manager/students/drop-student/drop-student-stop-pending-dialog";
import { DropStudentSummaryGrid } from "@/components/manager/students/drop-student/drop-student-summary-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { STUDENT_STATUSES } from "@/lib/constants/manager-student-status";
import { showErrorToast } from "@/lib/toast";
import type { DropStudentConsoleSnapshot } from "@/types/manager-drop-student-console";
import type {
  ManagerDropRefundPaymentRow,
  ManagerNeedRefundRow,
} from "@/types/manager-semester-drop";
import type { ManagerStudentRow } from "@/types/manager-student";
import { UserMinusIcon } from "lucide-react";

export function DropStudentPanel() {
  const [selected, setSelected] = useState<ManagerStudentRow | null>(null);
  const [snapshot, setSnapshot] = useState<DropStudentConsoleSnapshot | null>(
    null
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, startLoadTransition] = useTransition();

  const [dropTarget, setDropTarget] = useState<{
    classId: string;
    className: string;
    membershipId: string;
    semesterName: string;
  } | null>(null);
  const [dropAllOpen, setDropAllOpen] = useState(false);
  const [stopPending, setStopPending] = useState<{
    requestId: string;
    classId: string;
    semesterName: string;
  } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{
    membershipId: string;
    classId: string;
    className: string;
  } | null>(null);
  const [inactivateOpen, setInactivateOpen] = useState(false);
  const [processRefundRow, setProcessRefundRow] =
    useState<ManagerNeedRefundRow | null>(null);
  const [waiveRefundRow, setWaiveRefundRow] =
    useState<ManagerNeedRefundRow | null>(null);
  const [deletePaymentRow, setDeletePaymentRow] =
    useState<ManagerDropRefundPaymentRow | null>(null);

  const refreshSnapshot = useCallback((userId: string) => {
    startLoadTransition(async () => {
      const result = await loadDropStudentConsoleSnapshotAction(userId);
      if (!result.success) {
        setSnapshot(null);
        setLoadError(result.error);
        showErrorToast(result.error);
        return;
      }
      setLoadError(null);
      setSnapshot(result.snapshot);
    });
  }, []);

  function handleSelectStudent(student: ManagerStudentRow | null) {
    setSelected(student);
    setSnapshot(null);
    setLoadError(null);
    if (student) {
      refreshSnapshot(student.user_id);
    }
  }

  function handleCompleted() {
    if (selected) {
      refreshSnapshot(selected.user_id);
    }
  }

  function handleChooseAction(action: DropStudentActionOption) {
    switch (action.kind) {
      case "drop_semester":
        setDropTarget({
          classId: action.meta.class_id,
          className: action.meta.class_name,
          membershipId: action.meta.membership_id,
          semesterName: action.meta.semester_name,
        });
        break;
      case "drop_all_semesters":
        setDropAllOpen(true);
        break;
      case "stop_pending_drop":
        setStopPending({
          requestId: action.meta.request_id,
          classId: action.meta.class_id,
          semesterName: action.meta.semester_name,
        });
        break;
      case "remove_from_class":
        setRemoveTarget({
          membershipId: action.meta.id,
          classId: action.meta.class_id,
          className: action.meta.class_name,
        });
        break;
      case "inactivate":
        setInactivateOpen(true);
        break;
      case "process_refund": {
        const row =
          snapshot?.need_refund.find(
            (item) => item.id === action.meta.request_id
          ) ?? null;
        setProcessRefundRow(row);
        break;
      }
      case "waive_refund": {
        const row =
          snapshot?.need_refund.find(
            (item) => item.id === action.meta.request_id
          ) ?? null;
        setWaiveRefundRow(row);
        break;
      }
      case "delete_refund_payment": {
        const row =
          snapshot?.processed_refund_payments.find(
            (item) => item.id === action.meta.payment_id
          ) ?? null;
        setDeletePaymentRow(row);
        break;
      }
    }
  }

  const droppableCount =
    snapshot?.drop_targets.filter((target) => !target.has_pending_drop)
      .length ?? 0;

  return (
    <div className="@container/panel flex flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Drop student</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review the student, then run drop, remove, inactivate, or refund
          actions with clear consequences.
        </p>
      </div>

      <DropStudentBetaCard />
      <DropStudentSearch selected={selected} onSelect={handleSelectStudent} />

      {!selected ? (
        <EmptyState
          icon={UserMinusIcon}
          title="Select a student"
          description="Search above to load the exit console for one student."
        />
      ) : isLoading && !snapshot ? (
        <div className="flex items-center gap-2 rounded-xl border px-4 py-8 text-sm text-muted-foreground">
          <InlineSpinner />
          Loading student summary…
        </div>
      ) : loadError && !snapshot ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : snapshot ? (
        <>
          {isLoading ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <InlineSpinner />
              Refreshing…
            </p>
          ) : null}
          <DropStudentHotRow hot={snapshot.hot} />
          <DropStudentSummaryGrid snapshot={snapshot} />
          <DropStudentActionBar
            snapshot={snapshot}
            onChooseAction={handleChooseAction}
          />
        </>
      ) : null}

      {selected && dropTarget ? (
        <DropStudentDropDialog
          open={dropTarget !== null}
          onOpenChange={(open) => {
            if (!open) setDropTarget(null);
          }}
          studentId={selected.user_id}
          studentName={selected.full_name}
          classId={dropTarget.classId}
          className={dropTarget.className}
          membershipId={dropTarget.membershipId}
          semesterName={dropTarget.semesterName}
          onCompleted={handleCompleted}
        />
      ) : null}

      {selected ? (
        <DropStudentDropAllDialog
          open={dropAllOpen}
          onOpenChange={setDropAllOpen}
          studentId={selected.user_id}
          studentName={selected.full_name}
          semesterCount={droppableCount}
          onCompleted={handleCompleted}
        />
      ) : null}

      {stopPending ? (
        <DropStudentStopPendingDialog
          open={stopPending !== null}
          onOpenChange={(open) => {
            if (!open) setStopPending(null);
          }}
          requestId={stopPending.requestId}
          classId={stopPending.classId}
          semesterName={stopPending.semesterName}
          onCompleted={handleCompleted}
        />
      ) : null}

      {selected && removeTarget ? (
        <DropStudentRemoveDialog
          open={removeTarget !== null}
          onOpenChange={(open) => {
            if (!open) setRemoveTarget(null);
          }}
          membershipId={removeTarget.membershipId}
          classId={removeTarget.classId}
          className={removeTarget.className}
          studentName={selected.full_name}
          onCompleted={handleCompleted}
        />
      ) : null}

      {selected ? (
        <ActivateInactivateStudentDialog
          open={inactivateOpen}
          onOpenChange={setInactivateOpen}
          userId={selected.user_id}
          displayName={selected.full_name}
          currentStatus={selected.status ?? STUDENT_STATUSES.ACTIVE}
          onCompleted={() => {
            handleCompleted();
            setSelected((current) =>
              current
                ? { ...current, status: STUDENT_STATUSES.INACTIVE }
                : current
            );
          }}
        />
      ) : null}

      <ProcessDropRefundDialog
        open={processRefundRow !== null}
        onOpenChange={(open) => {
          if (!open) setProcessRefundRow(null);
        }}
        row={processRefundRow}
        onProcessed={() => {
          setProcessRefundRow(null);
          handleCompleted();
        }}
      />

      <WaiveDropRefundDialog
        open={waiveRefundRow !== null}
        onOpenChange={(open) => {
          if (!open) setWaiveRefundRow(null);
        }}
        row={waiveRefundRow}
        onWaived={() => {
          setWaiveRefundRow(null);
          handleCompleted();
        }}
      />

      <DeleteDropRefundPaymentDialog
        open={deletePaymentRow !== null}
        onOpenChange={(open) => {
          if (!open) setDeletePaymentRow(null);
        }}
        row={deletePaymentRow}
        onDeleted={() => {
          setDeletePaymentRow(null);
          handleCompleted();
        }}
      />
    </div>
  );
}
