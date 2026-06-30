"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { PANEL_ICONS } from "@/components/panels/panel-icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PanelNavItem } from "@/types/panel";

type AdminPanelSearchProps = {
  pages: PanelNavItem[];
  className?: string;
};

function matchesPage(page: PanelNavItem, query: string) {
  const haystack = `${page.title} ${page.href}`.toLowerCase();
  return haystack.includes(query);
}

export function AdminPanelSearch({ pages, className }: AdminPanelSearchProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!normalizedQuery) return [];
    return pages.filter((page) => matchesPage(page, normalizedQuery));
  }, [pages, normalizedQuery]);

  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

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

  const navigateTo = useCallback(
    (href: string) => {
      setQuery("");
      setIsOpen(false);
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

    if (!isOpen || results.length === 0) return;

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

  const showDropdown = isOpen && normalizedQuery.length > 0;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="admin-panel-search-list"
          aria-autocomplete="list"
          placeholder="Search admin pages…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-8"
        />
      </div>

      {showDropdown && (
        <ul
          id="admin-panel-search-list"
          role="listbox"
          className="absolute top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-md"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              No pages found
            </li>
          ) : (
            results.map((page, index) => {
              const Icon = PANEL_ICONS[page.icon];
              const isActive = index === activeIndex;

              return (
                <li key={page.href} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                      isActive && "bg-accent text-accent-foreground"
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => navigateTo(page.href)}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium">{page.title}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
