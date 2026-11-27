"use client";

import { useEffect, useState, useTransition } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { loadStudentsPageAction } from "@/app/manager/students/actions";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ManagerStudentRow } from "@/types/manager-student";

type DropStudentSearchProps = {
  selected: ManagerStudentRow | null;
  onSelect: (student: ManagerStudentRow | null) => void;
};

export function DropStudentSearch({
  selected,
  onSelect,
}: DropStudentSearchProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ManagerStudentRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (selected) {
      return;
    }
    const timer = window.setTimeout(() => {
      startTransition(async () => {
        const data = await loadStudentsPageAction({
          page: 1,
          pageSize: 12,
          search: query.trim() || undefined,
        });
        setSuggestions(data?.students ?? []);
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, selected]);

  if (selected) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
        <div>
          <p className="text-sm font-medium">{selected.full_name}</p>
          <p className="text-xs text-muted-foreground">{selected.email}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            onSelect(null);
            setQuery("");
          }}
        >
          <XIcon data-icon="inline-start" />
          Change student
        </Button>
      </div>
    );
  }

  return (
    <div className="relative space-y-2">
      <label className="text-sm font-medium" htmlFor="drop-student-search">
        Search student
      </label>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="drop-student-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            window.setTimeout(() => setIsFocused(false), 150);
          }}
          placeholder="Name, email, or phone…"
          className="pl-9"
          autoComplete="off"
        />
        {isPending ? (
          <InlineSpinner className="absolute top-1/2 right-3 -translate-y-1/2" />
        ) : null}
      </div>
      {isFocused ? (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-popover shadow-md">
          {suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {isPending ? "Searching…" : "No students found."}
            </li>
          ) : (
            suggestions.map((student) => (
              <li key={student.user_id}>
                <button
                  type="button"
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onSelect(student)}
                >
                  <span className="font-medium">{student.full_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {student.email}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
