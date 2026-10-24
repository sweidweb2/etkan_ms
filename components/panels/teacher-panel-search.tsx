"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SchoolIcon, SearchIcon, SettingsIcon } from "lucide-react";
import { loadTeacherSearchClassesAction } from "@/app/teacher/classes/actions";
import { Input } from "@/components/ui/input";
import {
  getTeacherClassDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { armGlobalTopLoaderNavigation } from "@/lib/loaders/bind-global-top-loader";
import { cn } from "@/lib/utils";

type TeacherSearchPage = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  kind: "page" | "class";
};

const STATIC_PAGES: TeacherSearchPage[] = [
  {
    id: "classes",
    title: "My classes",
    subtitle: "All teaching classes",
    href: ROUTES.TEACHER_CLASSES,
    kind: "page",
  },
  {
    id: "settings",
    title: "Settings",
    subtitle: "Profile and layout",
    href: ROUTES.TEACHER_SETTINGS,
    kind: "page",
  },
];

function matchesPage(page: TeacherSearchPage, query: string) {
  const haystack = `${page.title} ${page.subtitle ?? ""} ${page.href}`.toLowerCase();
  return haystack.includes(query);
}

type TeacherPanelSearchProps = {
  className?: string;
};

/** Center navbar search: portal pages + teaching class shortcuts. */
export function TeacherPanelSearch({ className }: TeacherPanelSearchProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [classes, setClasses] = useState<TeacherSearchPage[]>([]);
  const [hasLoadedClasses, setHasLoadedClasses] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();

  const catalog = useMemo(
    () => [...STATIC_PAGES, ...classes],
    [classes]
  );

  const results = useMemo(() => {
    if (!normalizedQuery) {
      return catalog.slice(0, 8);
    }
    return catalog.filter((page) => matchesPage(page, normalizedQuery));
  }, [catalog, normalizedQuery]);

  const resultsKey = results.map((page) => page.id).join("|");
  const [activeIndex, setActiveIndex] = useState(0);
  const [prevResultsKey, setPrevResultsKey] = useState(resultsKey);

  if (resultsKey !== prevResultsKey) {
    setPrevResultsKey(resultsKey);
    setActiveIndex(0);
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const ensureClassesLoaded = useCallback(async () => {
    if (hasLoadedClasses) {
      return;
    }
    setHasLoadedClasses(true);
    const rows = await loadTeacherSearchClassesAction();
    setClasses(
      rows.map((row) => ({
        id: `class-${row.id}`,
        title: row.name,
        subtitle: row.subject_name,
        href: getTeacherClassDetailRoute(row.id),
        kind: "class" as const,
      }))
    );
  }, [hasLoadedClasses]);

  const navigateTo = useCallback(
    (href: string) => {
      setQuery("");
      setIsOpen(false);
      armGlobalTopLoaderNavigation();
      router.push(href);
    },
    [router]
  );

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setQuery("");
      setIsOpen(false);
      return;
    }

    if (!isOpen || results.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (index) => (index - 1 + results.length) % results.length
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      navigateTo(results[activeIndex].href);
    }
  }

  const showDropdown = isOpen;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="teacher-panel-search-list"
          aria-autocomplete="list"
          placeholder="Search pages or classes…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
            void ensureClassesLoaded();
          }}
          onFocus={() => {
            setIsOpen(true);
            void ensureClassesLoaded();
          }}
          onKeyDown={handleKeyDown}
          className="h-9 pl-8"
        />
      </div>

      {showDropdown ? (
        <ul
          id="teacher-panel-search-list"
          role="listbox"
          className="absolute top-full z-50 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-popover py-1 text-popover-foreground shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">
              No pages or classes found
            </li>
          ) : (
            results.map((page, index) => {
              const isActive = index === activeIndex;
              const Icon = page.kind === "class" ? SchoolIcon : SettingsIcon;
              const PageIcon =
                page.id === "classes"
                  ? SchoolIcon
                  : page.id === "settings"
                    ? SettingsIcon
                    : Icon;

              return (
                <li key={page.id} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                      isActive && "bg-accent text-accent-foreground"
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => navigateTo(page.href)}
                  >
                    <PageIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {page.title}
                      </span>
                      {page.subtitle ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {page.subtitle}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      {page.kind === "class" ? "Class" : "Page"}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
