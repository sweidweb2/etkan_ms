"use client";

import { useMemo, useState } from "react";
import { usePermissions } from "@/components/auth/permissions-provider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildDropStudentActionOptions,
  type DropStudentActionOption,
} from "@/components/manager/students/drop-student/drop-student-actions";
import type { DropStudentConsoleSnapshot } from "@/types/manager-drop-student-console";

type DropStudentActionBarProps = {
  snapshot: DropStudentConsoleSnapshot;
  onChooseAction: (action: DropStudentActionOption) => void;
};

export function DropStudentActionBar({
  snapshot,
  onChooseAction,
}: DropStudentActionBarProps) {
  const permissions = usePermissions();
  const options = useMemo(
    () => buildDropStudentActionOptions(snapshot, permissions),
    [snapshot, permissions]
  );
  const [selectedId, setSelectedId] = useState<string>("");

  const selected =
    options.find((option) => option.id === selectedId) ?? null;

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div>
        <h3 className="text-sm font-medium">Action</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Choose what to do, review prerequisites and outcomes, then continue.
        </p>
      </div>

      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No actions available for your permissions on this student.
        </p>
      ) : (
        <>
          <Select
            value={selectedId || undefined}
            onValueChange={(value) => setSelectedId(value ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an action…" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem
                  key={option.id}
                  value={option.id}
                  disabled={option.disabled}
                >
                  {option.label}
                  {option.disabled ? " (blocked)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selected ? (
            <div className="grid gap-3 text-sm @2xl/panel:grid-cols-2">
              <div className="rounded-lg border bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Before you act
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {selected.prerequisites.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {selected.disabledReason ? (
                  <p className="mt-2 text-amber-800 dark:text-amber-200">
                    {selected.disabledReason}
                  </p>
                ) : null}
              </div>
              <div className="rounded-lg border bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  If you continue
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {selected.outcomes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={!selected || selected.disabled}
              onClick={() => {
                if (selected && !selected.disabled) {
                  onChooseAction(selected);
                }
              }}
            >
              Continue
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
