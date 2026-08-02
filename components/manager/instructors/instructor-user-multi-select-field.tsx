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
import { MANAGER_USER_ROLE_LABELS } from "@/lib/constants/manager-user-display";
import { cn } from "@/lib/utils";
import type { ManagerInstructorCandidateRow } from "@/types/manager-instructor";

type InstructorUserMultiSelectFieldProps = {
  users: ManagerInstructorCandidateRow[];
  selected: ManagerInstructorCandidateRow[];
  onChange: (users: ManagerInstructorCandidateRow[]) => void;
  disabled?: boolean;
  invalid?: boolean;
  inputId?: string;
};

function getUserLabel(user: ManagerInstructorCandidateRow) {
  return user.username ?? user.email ?? "User";
}

export function InstructorUserMultiSelectField({
  users,
  selected,
  onChange,
  disabled = false,
  invalid = false,
  inputId = "instructor-user-multi-select",
}: InstructorUserMultiSelectFieldProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const selectedIds = useMemo(
    () => new Set(selected.map((user) => user.id)),
    [selected]
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const unselected = users.filter((user) => !selectedIds.has(user.id));

    if (!q) {
      return unselected.slice(0, 8);
    }

    return unselected
      .filter((user) => {
        const haystack = [
          user.username ?? "",
          user.email,
          user.role,
          MANAGER_USER_ROLE_LABELS[user.role],
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 8);
  }, [query, selectedIds, users]);

  function addUser(user: ManagerInstructorCandidateRow) {
    if (selectedIds.has(user.id)) {
      return;
    }
    onChange([...selected, user]);
    setQuery("");
  }

  function removeUser(id: string) {
    onChange(selected.filter((user) => user.id !== id));
  }

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
          {selected.map((user) => {
            const label = getUserLabel(user);
            return (
              <span
                key={user.id}
                className="inline-flex max-w-full items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs text-foreground"
              >
                <span className="truncate">{label}</span>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Remove ${label}`}
                  className="rounded-sm p-0.5 hover:bg-primary/15"
                  onClick={() => removeUser(user.id)}
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
                ? "Type a username or email…"
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
                  addUser(suggestions[0]);
                }
              }
              if (
                event.key === "Backspace" &&
                query === "" &&
                selected.length > 0
              ) {
                removeUser(selected[selected.length - 1].id);
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
                    aria-label="Clear selected users"
                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      onChange([]);
                      setQuery("");
                    }}
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
          {suggestions.map((user) => (
            <button
              key={user.id}
              type="button"
              className="flex w-full flex-col rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              onMouseDown={(event) => {
                event.preventDefault();
                addUser(user);
              }}
            >
              <span className="font-medium">{getUserLabel(user)}</span>
              <span className="text-xs text-muted-foreground">
                {user.email || "No email"}
                {` · ${MANAGER_USER_ROLE_LABELS[user.role]}`}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {isFocused && users.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          All users are already instructors.
        </p>
      ) : null}

      {isFocused &&
      users.length > 0 &&
      suggestions.length === 0 &&
      query.trim() ? (
        <p className="text-sm text-muted-foreground">No matching users.</p>
      ) : null}
    </div>
  );
}
