"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronUpIcon, SearchIcon } from "lucide-react";
import {
  updateRolePermissionsAction,
  type UpdateRolePermissionsActionState,
} from "@/app/manager/rbac/actions";
import { Can } from "@/components/auth/can";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import {
  PERMISSION_FEATURE_LABELS,
  PERMISSION_FEATURES,
  PERMISSIONS,
  type PermissionDefinition,
  type PermissionFeature,
  type PermissionKey,
} from "@/lib/constants/permissions";
import { MANAGER_USER_ROLE_LABELS } from "@/lib/constants/manager-user-display";
import { ROLE_VALUES, ROLES, type RoleValue } from "@/lib/constants/roles";
import { cn } from "@/lib/utils";

type ManagerRbacPanelProps = {
  initialGrantsByRole: Record<RoleValue, PermissionKey[]>;
  catalog: readonly PermissionDefinition[];
};

const initialActionState: UpdateRolePermissionsActionState = {};
const SCROLL_TOP_THRESHOLD_PX = 320;
const SEARCH_RESULT_LIMIT = 12;

function sortedKeys(keys: Iterable<PermissionKey>): PermissionKey[] {
  return [...keys].sort();
}

function sameKeySet(a: PermissionKey[], b: PermissionKey[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const left = sortedKeys(a);
  const right = sortedKeys(b);
  return left.every((key, index) => key === right[index]);
}

function permissionRowId(key: PermissionKey) {
  return `perm-row-${key}`;
}

function matchesPermission(
  definition: PermissionDefinition,
  query: string
): boolean {
  const featureLabel = PERMISSION_FEATURE_LABELS[definition.feature];
  const haystack =
    `${definition.key} ${definition.label} ${featureLabel} ${definition.access}`.toLowerCase();
  return haystack.includes(query);
}

export function ManagerRbacPanel({
  initialGrantsByRole,
  catalog,
}: ManagerRbacPanelProps) {
  const pageTopRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [selectedRole, setSelectedRole] = useState<RoleValue>(ROLES.MANAGER);
  const [editsByRole, setEditsByRole] = useState<
    Partial<Record<RoleValue, PermissionKey[]>>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [highlightedKey, setHighlightedKey] = useState<PermissionKey | null>(
    null
  );
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [state, formAction, isActionPending] = useActionState(
    updateRolePermissionsAction,
    initialActionState
  );
  useActionStateToast(state, isActionPending);

  const grouped = useMemo(() => {
    return PERMISSION_FEATURES.map((feature) => ({
      feature,
      definitions: catalog.filter(
        (definition) => definition.feature === feature
      ),
    })).filter((group) => group.definitions.length > 0);
  }, [catalog]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!normalizedSearch) {
      return [];
    }
    return catalog
      .filter((definition) => matchesPermission(definition, normalizedSearch))
      .slice(0, SEARCH_RESULT_LIMIT);
  }, [catalog, normalizedSearch]);

  const savedKeys = initialGrantsByRole[selectedRole] ?? [];
  const draftKeys = editsByRole[selectedRole] ?? savedKeys;
  const isDirty = !sameKeySet(draftKeys, savedKeys);
  const draftSet = useMemo(() => new Set(draftKeys), [draftKeys]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function updateScrollTopVisibility() {
      const y =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      setShowScrollTop(y > SCROLL_TOP_THRESHOLD_PX);
    }

    updateScrollTopVisibility();
    window.addEventListener("scroll", updateScrollTopVisibility, {
      passive: true,
    });
    document.addEventListener("scroll", updateScrollTopVisibility, {
      passive: true,
      capture: true,
    });

    return () => {
      window.removeEventListener("scroll", updateScrollTopVisibility);
      document.removeEventListener("scroll", updateScrollTopVisibility, true);
    };
  }, []);

  useEffect(() => {
    if (!highlightedKey) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setHighlightedKey(null);
    }, 1800);
    return () => window.clearTimeout(timeoutId);
  }, [highlightedKey]);

  function handleRoleChange(role: string | null) {
    if (!role) {
      return;
    }
    setSelectedRole(role as RoleValue);
  }

  function setDraftKeys(keys: PermissionKey[]) {
    setEditsByRole((prev) => ({
      ...prev,
      [selectedRole]: keys,
    }));
  }

  function resetDraft() {
    setEditsByRole((prev) => {
      const next = { ...prev };
      delete next[selectedRole];
      return next;
    });
  }

  function toggleKey(key: PermissionKey, checked: boolean) {
    const next = new Set(draftKeys);
    if (checked) {
      next.add(key);
    } else {
      next.delete(key);
    }
    setDraftKeys(sortedKeys(next));
  }

  function setFeatureKeys(feature: PermissionFeature, checked: boolean) {
    const featureKeys = catalog
      .filter((definition) => definition.feature === feature)
      .map((definition) => definition.key);
    const next = new Set(draftKeys);
    for (const key of featureKeys) {
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
    }
    setDraftKeys(sortedKeys(next));
  }

  function scrollToPermission(key: PermissionKey) {
    const target = document.getElementById(permissionRowId(key));
    if (!target) {
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedKey(key);
    setSearchQuery("");
    setIsSearchOpen(false);
    setActiveSearchIndex(0);
  }

  function scrollToPageTop() {
    pageTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setSearchQuery("");
      setIsSearchOpen(false);
      return;
    }

    if (!isSearchOpen || searchResults.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSearchIndex((index) => (index + 1) % searchResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSearchIndex(
        (index) => (index - 1 + searchResults.length) % searchResults.length
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selected = searchResults[activeSearchIndex];
      if (selected) {
        scrollToPermission(selected.key);
      }
    }
  }

  const showSearchDropdown = isSearchOpen && normalizedSearch.length > 0;

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div ref={pageTopRef}>
        <h1 className="text-2xl font-semibold tracking-tight">Permissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Grant or revoke permissions for each role. Changes apply on the next
          request.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={selectedRole} onValueChange={handleRoleChange}>
          <SelectTrigger
            id="rbac-role"
            aria-label="Select role"
            className="w-full sm:w-48"
          >
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_VALUES.map((role) => (
              <SelectItem key={role} value={role}>
                {MANAGER_USER_ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div ref={searchContainerRef} className="relative min-w-0 flex-1">
          <label htmlFor="rbac-permission-search" className="sr-only">
            Find permission
          </label>
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="rbac-permission-search"
            type="search"
            role="combobox"
            aria-expanded={showSearchDropdown}
            aria-controls="rbac-permission-search-list"
            aria-autocomplete="list"
            placeholder="Find permission…"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setIsSearchOpen(true);
              setActiveSearchIndex(0);
            }}
            onFocus={() => setIsSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
            className="pl-9"
          />

          {showSearchDropdown ? (
            <ul
              id="rbac-permission-search-list"
              role="listbox"
              className="absolute top-full z-50 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-md"
            >
              {searchResults.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  No permissions found
                </li>
              ) : (
                searchResults.map((definition, index) => {
                  const isActive = index === activeSearchIndex;
                  return (
                    <li
                      key={definition.key}
                      role="option"
                      aria-selected={isActive}
                    >
                      <button
                        type="button"
                        className={cn(
                          "flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                          isActive && "bg-accent text-accent-foreground"
                        )}
                        onMouseEnter={() => setActiveSearchIndex(index)}
                        onClick={() => scrollToPermission(definition.key)}
                      >
                        <span className="font-medium">{definition.label}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {definition.key}
                          <span className="ml-2 text-[10px] uppercase tracking-wide">
                            {PERMISSION_FEATURE_LABELS[definition.feature]}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {grouped.map(({ feature, definitions }) => {
          const allChecked = definitions.every((definition) =>
            draftSet.has(definition.key)
          );
          const someChecked =
            !allChecked &&
            definitions.some((definition) => draftSet.has(definition.key));

          return (
            <section key={feature} className="rounded-lg border border-border">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
                <h2 className="text-sm font-semibold">
                  {PERMISSION_FEATURE_LABELS[feature]}
                </h2>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={allChecked || isActionPending}
                    onClick={() => setFeatureKeys(feature, true)}
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={
                      (!allChecked && !someChecked) || isActionPending
                    }
                    onClick={() => setFeatureKeys(feature, false)}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <ul className="divide-y divide-border">
                {definitions.map((definition) => {
                  const checked = draftSet.has(definition.key);
                  const isHighlighted = highlightedKey === definition.key;
                  return (
                    <li
                      key={definition.key}
                      id={permissionRowId(definition.key)}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 scroll-mt-24 transition-colors",
                        isHighlighted &&
                          "bg-primary/10 ring-2 ring-primary/40 ring-inset"
                      )}
                    >
                      <input
                        id={`perm-${definition.key}`}
                        type="checkbox"
                        checked={checked}
                        disabled={isActionPending}
                        onChange={(event) =>
                          toggleKey(definition.key, event.target.checked)
                        }
                        className="mt-0.5 size-4 shrink-0 rounded border border-input accent-primary"
                        aria-label={definition.label}
                      />
                      <label
                        htmlFor={`perm-${definition.key}`}
                        className="min-w-0 flex-1 cursor-pointer"
                      >
                        <span className="block text-sm font-medium">
                          {definition.label}
                        </span>
                        <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                          {definition.key}
                          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                            {definition.access}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <Can permission={PERMISSIONS.RBAC_MANAGE}>
        <form
          action={formAction}
          className="fixed right-4 bottom-6 z-40 flex items-center gap-2 rounded-xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur-sm sm:right-6"
        >
          <input type="hidden" name="role" value={selectedRole} />
          {draftKeys.map((key) => (
            <input
              key={key}
              type="hidden"
              name="permissionKeys"
              value={key}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={isActionPending || !isDirty}
            onClick={resetDraft}
          >
            Reset
          </Button>
          <Button type="submit" disabled={isActionPending || !isDirty}>
            {isActionPending ? <InlineSpinner /> : null}
            Save permissions
          </Button>
        </form>
      </Can>

      {showScrollTop ? (
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label="Back to top"
          className="fixed bottom-6 left-1/2 z-40 size-10 -translate-x-1/2 rounded-full border border-border shadow-md"
          onClick={scrollToPageTop}
        >
          <ChevronUpIcon className="size-5" />
        </Button>
      ) : null}
    </div>
  );
}
