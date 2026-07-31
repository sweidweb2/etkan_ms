"use client";

import { useMemo, useState } from "react";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ManagerStudentRow } from "@/types/manager-student";

type StudentMultiSelectFieldProps = {
  students: ManagerStudentRow[];
  selected: ManagerStudentRow[];
  onChange: (students: ManagerStudentRow[]) => void;
  disabled?: boolean;
  invalid?: boolean;
  inputId?: string;
};

function studentKey(student: ManagerStudentRow) {
  return student.student_profile_id;
}

function getStudentLabel(student: ManagerStudentRow) {
  return `${student.full_name} · ${student.email}`;
}

export function StudentMultiSelectField({
  students,
  selected,
  onChange,
  disabled = false,
  invalid = false,
  inputId = "student-multi-select",
}: StudentMultiSelectFieldProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const selectedKeys = useMemo(
    () => new Set(selected.map(studentKey)),
    [selected]
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const unselected = students.filter(
      (student) => !selectedKeys.has(studentKey(student))
    );

    if (!q) {
      return unselected.slice(0, 8);
    }

    return unselected
      .filter((student) => {
        const haystack = [
          student.full_name,
          student.email,
          student.username ?? "",
          student.phone ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 8);
  }, [query, selectedKeys, students]);

  const addStudent = (student: ManagerStudentRow) => {
    if (selectedKeys.has(studentKey(student))) {
      return;
    }
    onChange([...selected, student]);
    setQuery("");
  };

  const removeStudent = (id: string) => {
    onChange(selected.filter((student) => studentKey(student) !== id));
  };

  const clearSelected = () => {
    onChange([]);
    setQuery("");
  };

  const selectAll = () => {
    onChange(students);
    setQuery("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "flex min-h-11 items-start gap-1 rounded-lg border border-input bg-transparent px-2 py-1.5",
          isFocused && !invalid && "border-ring ring-3 ring-ring/50",
          invalid && "border-destructive ring-3 ring-destructive/20"
        )}
        aria-invalid={invalid || undefined}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {selected.map((student) => {
            const key = studentKey(student);
            const label = getStudentLabel(student);

            return (
              <span
                key={key}
                className="inline-flex max-w-full items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs text-foreground"
              >
                <span className="truncate">{label}</span>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Remove ${student.full_name}`}
                  className="rounded-sm p-0.5 hover:bg-primary/15"
                  onClick={() => removeStudent(key)}
                >
                  <XIcon className="size-3" />
                </button>
              </span>
            );
          })}
          <Input
            id={inputId}
            type="text"
            autoComplete="off"
            value={query}
            disabled={disabled}
            placeholder={
              selected.length === 0
                ? "Type a name or email…"
                : "Add another…"
            }
            className="h-8 min-w-[10rem] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              window.setTimeout(() => setIsFocused(false), 150);
            }}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (suggestions[0]) {
                  addStudent(suggestions[0]);
                }
              }
              if (
                event.key === "Backspace" &&
                query === "" &&
                selected.length > 0
              ) {
                removeStudent(studentKey(selected[selected.length - 1]));
              }
            }}
          />
        </div>
        {selected.length > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={disabled}
                    aria-label="Clear selected students"
                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={clearSelected}
                  />
                }
              >
                <XIcon className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent side="top">Clear all</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>

      {isFocused && suggestions.length > 0 ? (
        <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md">
          {suggestions.map((student) => (
            <button
              key={student.student_profile_id}
              type="button"
              className="flex w-full flex-col rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              onMouseDown={(event) => {
                event.preventDefault();
                addStudent(student);
              }}
            >
              <span className="font-medium">{student.full_name}</span>
              <span className="text-xs text-muted-foreground">
                {student.email}
                {student.username ? ` · ${student.username}` : ""}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {students.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || selected.length === students.length}
            onClick={selectAll}
          >
            Select all
          </Button>
        </div>
      ) : null}
    </div>
  );
}
