import { PERMISSIONS, type PermissionKey } from "@/lib/constants/permissions";
import { STUDENT_STATUSES } from "@/lib/constants/manager-student-status";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import type { DropStudentConsoleSnapshot } from "@/types/manager-drop-student-console";

export type DropStudentActionKind =
  | "drop_semester"
  | "drop_all_semesters"
  | "stop_pending_drop"
  | "remove_from_class"
  | "inactivate"
  | "process_refund"
  | "waive_refund"
  | "delete_refund_payment";

export type DropStudentActionOption = {
  id: string;
  kind: DropStudentActionKind;
  label: string;
  permission: PermissionKey;
  disabled?: boolean;
  disabledReason?: string;
  prerequisites: string[];
  outcomes: string[];
  meta: Record<string, string>;
};

export function buildDropStudentActionOptions(
  snapshot: DropStudentConsoleSnapshot,
  permissions: ReadonlySet<PermissionKey>
): DropStudentActionOption[] {
  const options: DropStudentActionOption[] = [];
  const can = (permission: PermissionKey) => permissions.has(permission);

  if (can(PERMISSIONS.CLASSES_DROP_SEMESTER)) {
    for (const target of snapshot.drop_targets) {
      const disabled = target.has_pending_drop;
      options.push({
        id: `drop_semester:${target.semester_id}`,
        kind: "drop_semester",
        label: `Drop · ${target.semester_name}`,
        permission: PERMISSIONS.CLASSES_DROP_SEMESTER,
        disabled,
        disabledReason: disabled
          ? "A pending drop already exists for this semester. Stop or finish it first."
          : undefined,
        prerequisites: [
          "Student is in at least one class in this semester.",
          "No other pending drop for this semester.",
          "Empty / 0 restriction = none (immediate, keep payments, no refund).",
          "Unpaid restriction creates a pending drop until payment meets the gate.",
        ],
        outcomes: [
          "Leaves scheduled/in-progress classes in the semester (origin class included).",
          "Semester enrollment → withdrawn when completed.",
          "SPP kept; settlement may apply; refund owed only if overpaid and not none.",
          "Profile status unchanged. Tasks, grades, and attendance stay.",
        ],
        meta: {
          semester_id: target.semester_id,
          semester_name: target.semester_name,
          class_id: target.origin_class_id,
          class_name: target.origin_class_name,
          membership_id: target.origin_membership_id,
          student_id: snapshot.student.user_id,
        },
      });
    }

    const droppableNow = snapshot.drop_targets.filter((t) => !t.has_pending_drop);
    options.push({
      id: "drop_all_semesters",
      kind: "drop_all_semesters",
      label: "Drop all semesters",
      permission: PERMISSIONS.CLASSES_DROP_SEMESTER,
      disabled: droppableNow.length === 0,
      disabledReason:
        snapshot.drop_targets.length === 0
          ? "No active semester memberships to drop."
          : "Every droppable semester already has a pending drop.",
      prerequisites: [
        "Same restriction applied to every semester.",
        "Each drop must complete immediately (no pending left behind).",
        "If one semester fails, earlier successful drops stay applied.",
      ],
      outcomes: [
        `Immediately drops ${droppableNow.length} semester(s) when the gate is already met or restriction is none.`,
        "Same leave/withdraw/SPP rules as a single Drop.",
        "Profile stays active unless you inactivate separately.",
      ],
      meta: {
        student_id: snapshot.student.user_id,
      },
    });

    for (const drop of snapshot.drops.filter((row) => row.status === "pending")) {
      options.push({
        id: `stop_pending_drop:${drop.id}`,
        kind: "stop_pending_drop",
        label: `Stop pending drop · ${drop.semester_name ?? "semester"}`,
        permission: PERMISSIONS.CLASSES_DROP_SEMESTER,
        prerequisites: ["Only pending drop requests can be cancelled."],
        outcomes: [
          "Drop request → cancelled.",
          "Student stays in classes; no settlement or refund.",
        ],
        meta: {
          request_id: drop.id,
          class_id: drop.class_id,
          semester_name: drop.semester_name ?? "",
        },
      });
    }
  }

  if (can(PERMISSIONS.CLASSES_REMOVE_STUDENT)) {
    for (const row of snapshot.classes) {
      options.push({
        id: `remove_from_class:${row.student_class_id}`,
        kind: "remove_from_class",
        label: `Remove from class · ${row.class_name}`,
        permission: PERMISSIONS.CLASSES_REMOVE_STUDENT,
        disabled: !row.can_remove,
        disabledReason: row.remove_blocked_reason ?? undefined,
        prerequisites: [
          "No pending semester drop.",
          "Semester SPP must have no payments (otherwise use Drop).",
        ],
        outcomes: [
          "Removes only this class membership.",
          "If last class in the semester and unpaid open SPP exists, that SPP is deleted.",
          "Profile status and other classes unchanged.",
        ],
        meta: {
          id: row.student_class_id,
          class_id: row.class_id,
          class_name: row.class_name,
        },
      });
    }
  }

  if (
    can(PERMISSIONS.STUDENTS_CHANGE_STATUS) &&
    snapshot.status === STUDENT_STATUSES.ACTIVE
  ) {
    options.push({
      id: "inactivate",
      kind: "inactivate",
      label: "Inactivate student",
      permission: PERMISSIONS.STUDENTS_CHANGE_STATUS,
      disabled: !snapshot.hot.can_inactivate,
      disabledReason: snapshot.hot.inactivate_blocked_reason ?? undefined,
      prerequisites: [
        "No pending semester drop.",
        "Paid open SPPs force immediate semester drops with a restriction (empty/0 = none).",
        "Optional: leave eligible classes; delete unpaid open SPPs.",
      ],
      outcomes: [
        "Profile status → inactive.",
        "May leave classes and/or delete payment-free open SPPs.",
        "Paid open SPPs are dropped immediately (not deleted).",
        "Tasks, grades, and attendance stay.",
      ],
      meta: {
        user_id: snapshot.student.user_id,
        full_name: snapshot.student.full_name,
        status: snapshot.status,
      },
    });
  }

  if (can(PERMISSIONS.ACCOUNTING_DROP_REFUNDS_PROCESS)) {
    for (const row of snapshot.need_refund) {
      options.push({
        id: `process_refund:${row.id}`,
        kind: "process_refund",
        label: `Mark refunded · ${formatPaymentPhaseMoney(row.remaining_refund)}`,
        permission: PERMISSIONS.ACCOUNTING_DROP_REFUNDS_PROCESS,
        prerequisites: ["Completed drop with remaining refund owed."],
        outcomes: [
          "Creates a debit payment linked to the drop.",
          "Raises refunded amount; may move refund status to processed.",
          "Debit affects payment stats until deleted from the console/exceptions.",
        ],
        meta: { request_id: row.id },
      });
    }
  }

  if (can(PERMISSIONS.ACCOUNTING_DROP_REFUNDS_WAIVE)) {
    for (const row of snapshot.need_refund) {
      options.push({
        id: `waive_refund:${row.id}`,
        kind: "waive_refund",
        label: `Waive refund · ${formatPaymentPhaseMoney(row.remaining_refund)}`,
        permission: PERMISSIONS.ACCOUNTING_DROP_REFUNDS_WAIVE,
        prerequisites: ["Completed drop with remaining refund owed."],
        outcomes: [
          "Clears remaining owed without creating a debit.",
          "Student keeps the overpayment; drop stays completed.",
        ],
        meta: { request_id: row.id },
      });
    }
  }

  if (can(PERMISSIONS.ACCOUNTING_PAYMENTS_DELETE)) {
    for (const row of snapshot.processed_refund_payments) {
      options.push({
        id: `delete_refund_payment:${row.id}`,
        kind: "delete_refund_payment",
        label: `Delete refund debit · ${formatPaymentPhaseMoney(row.amount)}`,
        permission: PERMISSIONS.ACCOUNTING_PAYMENTS_DELETE,
        prerequisites: ["Processed drop-refund debit payment exists."],
        outcomes: [
          "Deletes the debit so it no longer affects payment stats.",
          "Drop stays completed; refund sync clears owed when fully wiped.",
        ],
        meta: { payment_id: row.id },
      });
    }
  }

  return options;
}
