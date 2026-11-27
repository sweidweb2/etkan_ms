import { FlaskConicalIcon } from "lucide-react";

export function DropStudentBetaCard() {
  return (
    <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
      <FlaskConicalIcon className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
      <div className="space-y-1">
        <p className="font-medium text-amber-950 dark:text-amber-100">
          Beta — Drop student console
        </p>
        <p className="text-amber-900/80 dark:text-amber-100/80">
          Early exit workspace for drop, remove, inactivate, and refunds. Behavior
          and layout will improve; all actions still follow the same live rules as
          class roster and Manage students.
        </p>
      </div>
    </div>
  );
}
