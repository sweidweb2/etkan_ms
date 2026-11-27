"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EMAIL_REGEX } from "@/lib/validators/auth/fields";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { showErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ManagerUserRow } from "@/types/manager-user";

export type ComposeRecipient =
  | { kind: "user"; user: ManagerUserRow }
  | { kind: "external"; email: string };

type RecipientToFieldProps = {
  /** Pre-loaded users (static). Prefer `searchUsers` for large directories. */
  users?: ManagerUserRow[];
  /** Server search for typeahead suggestions. */
  searchUsers?: (query: string) => Promise<ManagerUserRow[]>;
  /** On-demand bulk roster for role shortcuts. */
  loadUsersByRole?: (roles?: RoleValue[]) => Promise<ManagerUserRow[]>;
  /** Resolve a typed email to an existing user when possible. */
  resolveUserByEmail?: (email: string) => Promise<ManagerUserRow | null>;
  recipients: ComposeRecipient[];
  onChange: (recipients: ComposeRecipient[]) => void;
  disabled?: boolean;
  invalid?: boolean;
};

const BULK_OPTIONS: Array<{ id: string; label: string; roles?: RoleValue[] }> =
  [
    { id: "all_users", label: "All users" },
    { id: "all_students", label: "All students", roles: [ROLES.STUDENT] },
    { id: "all_teachers", label: "All teachers", roles: [ROLES.TEACHER] },
    { id: "all_managers", label: "All managers", roles: [ROLES.MANAGER] },
    {
      id: "all_co_managers",
      label: "All co-managers",
      roles: [ROLES.CO_MANAGER],
    },
    { id: "all_admins", label: "All admins", roles: [ROLES.ADMIN] },
    { id: "all_ceos", label: "All CEOs", roles: [ROLES.CEO] },
    {
      id: "all_supervisors",
      label: "All supervisors",
      roles: [ROLES.SUPERVISOR],
    },
    { id: "all_crms", label: "All CRMs", roles: [ROLES.CRM] },
  ];

const EMPTY_USERS: ManagerUserRow[] = [];

function getUserDisplayName(user: ManagerUserRow) {
  return user.full_name || user.email;
}

function recipientKey(recipient: ComposeRecipient) {
  return recipient.kind === "user"
    ? `user:${recipient.user.id}`
    : `email:${recipient.email.toLowerCase()}`;
}

export function RecipientToField({
  users: usersProp,
  searchUsers,
  loadUsersByRole,
  resolveUserByEmail,
  recipients,
  onChange,
  disabled = false,
  invalid = false,
}: RecipientToFieldProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<ManagerUserRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingBulk, setIsLoadingBulk] = useState(false);
  const searchRequestIdRef = useRef(0);
  const hasSearchedRef = useRef(false);

  const selectedKeys = useMemo(
    () => new Set(recipients.map(recipientKey)),
    [recipients]
  );

  const staticUsersWithEmail = useMemo(
    () => (usersProp ?? EMPTY_USERS).filter((user) => Boolean(user.email?.trim())),
    [usersProp]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const runSearch = useCallback(
    async (search: string) => {
      if (!searchUsers) {
        const q = search.toLowerCase();
        const next = staticUsersWithEmail
          .filter((user) => {
            if (selectedKeys.has(`user:${user.id}`)) {
              return false;
            }
            if (!q) {
              return true;
            }
            const haystack = [user.email, user.full_name, user.role]
              .join(" ")
              .toLowerCase();
            return haystack.includes(q);
          })
          .slice(0, 8);
        setSuggestions(next);
        return;
      }

      const requestId = ++searchRequestIdRef.current;
      setIsSearching(true);
      try {
        const loaded = await searchUsers(search);
        if (requestId !== searchRequestIdRef.current) {
          return;
        }
        setSuggestions(
          loaded
            .filter((user) => !selectedKeys.has(`user:${user.id}`))
            .slice(0, 8)
        );
      } catch {
        if (requestId !== searchRequestIdRef.current) {
          return;
        }
        showErrorToast("Unable to search recipients.");
        setSuggestions([]);
      } finally {
        if (requestId === searchRequestIdRef.current) {
          setIsSearching(false);
        }
      }
    },
    [searchUsers, selectedKeys, staticUsersWithEmail]
  );

  useEffect(() => {
    if (!isFocused && !hasSearchedRef.current) {
      return;
    }
    hasSearchedRef.current = true;
    void runSearch(debouncedQuery);
  }, [debouncedQuery, isFocused, runSearch]);

  const addUser = (user: ManagerUserRow) => {
    if (!user.email?.trim() || selectedKeys.has(`user:${user.id}`)) {
      return;
    }
    onChange([...recipients, { kind: "user", user }]);
    setQuery("");
  };

  const addExternal = async (email: string) => {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      return;
    }
    if (selectedKeys.has(`email:${normalized}`)) {
      setQuery("");
      return;
    }

    const localMatch = [...suggestions, ...staticUsersWithEmail].find(
      (user) => user.email.toLowerCase() === normalized
    );
    if (localMatch) {
      addUser(localMatch);
      return;
    }

    if (resolveUserByEmail) {
      try {
        const resolved = await resolveUserByEmail(normalized);
        if (resolved?.email?.trim()) {
          addUser(resolved);
          return;
        }
      } catch {
        // Fall through to external recipient.
      }
    }

    onChange([...recipients, { kind: "external", email: normalized }]);
    setQuery("");
  };

  const removeRecipient = (key: string) => {
    onChange(recipients.filter((recipient) => recipientKey(recipient) !== key));
  };

  const clearRecipients = () => {
    onChange([]);
    setQuery("");
  };

  const applyBulk = async (roles?: RoleValue[]) => {
    if (!loadUsersByRole && !usersProp) {
      showErrorToast("Unable to load recipients.");
      return;
    }

    setIsLoadingBulk(true);
    try {
      const loaded = loadUsersByRole
        ? await loadUsersByRole(roles)
        : staticUsersWithEmail.filter((user) =>
            roles ? roles.includes(user.role) : true
          );
      const loadedWithEmail = loaded.filter((user) =>
        Boolean(user.email?.trim())
      );
      const pool = roles
        ? loadedWithEmail.filter((user) => roles.includes(user.role))
        : loadedWithEmail;

      const next = [...recipients];
      const keys = new Set(next.map(recipientKey));

      for (const user of pool) {
        const key = `user:${user.id}`;
        if (keys.has(key)) {
          continue;
        }
        next.push({ kind: "user", user });
        keys.add(key);
      }

      onChange(next);
    } catch {
      showErrorToast("Unable to load recipients.");
    } finally {
      setIsLoadingBulk(false);
    }
  };

  const showSuggestions =
    isFocused &&
    (suggestions.length > 0 ||
      isSearching ||
      EMAIL_REGEX.test(query.trim()));

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
          {recipients.map((recipient) => {
            const key = recipientKey(recipient);
            const label =
              recipient.kind === "user"
                ? `${getUserDisplayName(recipient.user)} <${recipient.user.email}>`
                : recipient.email;

            return (
              <span
                key={key}
                className="inline-flex max-w-full items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs text-foreground"
              >
                <span className="truncate">{label}</span>
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Remove ${label}`}
                  className="rounded-sm p-0.5 hover:bg-primary/15"
                  onClick={() => removeRecipient(key)}
                >
                  <XIcon className="size-3" />
                </button>
              </span>
            );
          })}
          <Input
            id="compose-to"
            type="text"
            inputMode="email"
            autoComplete="email"
            value={query}
            disabled={disabled}
            placeholder={
              recipients.length === 0
                ? "Type a name or email…"
                : "Add another…"
            }
            className="h-8 min-w-[10rem] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
            onFocus={() => {
              setIsFocused(true);
              if (!hasSearchedRef.current) {
                void runSearch(query.trim());
                hasSearchedRef.current = true;
              }
            }}
            onBlur={() => {
              window.setTimeout(() => setIsFocused(false), 150);
            }}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === "," ||
                event.key === ";"
              ) {
                event.preventDefault();
                if (suggestions[0]) {
                  addUser(suggestions[0]);
                } else {
                  void addExternal(query);
                }
              }
              if (
                event.key === "Backspace" &&
                query === "" &&
                recipients.length > 0
              ) {
                removeRecipient(recipientKey(recipients[recipients.length - 1]));
              }
            }}
          />
        </div>
        {recipients.length > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={disabled}
                    aria-label="Clear all recipients"
                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={clearRecipients}
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

      {showSuggestions ? (
        <div className="rounded-lg border border-border bg-popover p-1 shadow-md">
          {isSearching && suggestions.length === 0 ? (
            <p className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground">
              <Loader2Icon className="size-3 animate-spin" aria-hidden />
              Searching…
            </p>
          ) : null}
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
              <span className="font-medium">{getUserDisplayName(user)}</span>
              <span className="text-xs text-muted-foreground">
                {user.email} · {user.role}
              </span>
            </button>
          ))}
          {suggestions.length === 0 &&
          !isSearching &&
          EMAIL_REGEX.test(query.trim()) ? (
            <button
              type="button"
              className="flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              onMouseDown={(event) => {
                event.preventDefault();
                void addExternal(query);
              }}
            >
              Add {query.trim().toLowerCase()}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {isLoadingBulk ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2Icon className="size-3 animate-spin" aria-hidden />
            Loading recipients…
          </span>
        ) : null}
        {BULK_OPTIONS.map((option) => (
          <Button
            key={option.id}
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || isLoadingBulk}
            onClick={() => void applyBulk(option.roles)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
