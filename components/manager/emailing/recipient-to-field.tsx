"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
  /** Pre-loaded users. Omit and pass `loadUsers` to fetch on first interaction. */
  users?: ManagerUserRow[];
  /** Lazy loader — called once on first focus / bulk click. */
  loadUsers?: () => Promise<ManagerUserRow[]>;
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
  return user.username ?? user.student_full_name ?? user.email;
}

function recipientKey(recipient: ComposeRecipient) {
  return recipient.kind === "user"
    ? `user:${recipient.user.id}`
    : `email:${recipient.email.toLowerCase()}`;
}

export function RecipientToField({
  users: usersProp,
  loadUsers,
  recipients,
  onChange,
  disabled = false,
  invalid = false,
}: RecipientToFieldProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [lazyUsers, setLazyUsers] = useState<ManagerUserRow[] | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const loadPromiseRef = useRef<Promise<ManagerUserRow[]> | null>(null);
  const users = usersProp ?? lazyUsers ?? EMPTY_USERS;

  const ensureUsersLoaded = useCallback((): Promise<ManagerUserRow[]> => {
    if (usersProp) {
      return Promise.resolve(usersProp);
    }
    if (!loadUsers) {
      return Promise.resolve(EMPTY_USERS);
    }
    if (!loadPromiseRef.current) {
      setIsLoadingUsers(true);
      loadPromiseRef.current = loadUsers()
        .then((loaded) => {
          setLazyUsers(loaded);
          return loaded;
        })
        .catch(() => {
          // Allow a retry on the next interaction.
          loadPromiseRef.current = null;
          showErrorToast("Unable to load recipients.");
          return EMPTY_USERS;
        })
        .finally(() => setIsLoadingUsers(false));
    }
    return loadPromiseRef.current;
  }, [loadUsers, usersProp]);

  const selectedKeys = useMemo(
    () => new Set(recipients.map(recipientKey)),
    [recipients]
  );

  const usersWithEmail = useMemo(
    () => users.filter((user) => Boolean(user.email?.trim())),
    [users]
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return usersWithEmail
        .filter((user) => !selectedKeys.has(`user:${user.id}`))
        .slice(0, 8);
    }

    return usersWithEmail
      .filter((user) => {
        if (selectedKeys.has(`user:${user.id}`)) {
          return false;
        }
        const haystack = [
          user.email,
          user.username ?? "",
          user.student_full_name ?? "",
          user.role,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 8);
  }, [query, selectedKeys, usersWithEmail]);

  const addUser = (user: ManagerUserRow) => {
    if (!user.email?.trim() || selectedKeys.has(`user:${user.id}`)) {
      return;
    }
    onChange([...recipients, { kind: "user", user }]);
    setQuery("");
  };

  const addExternal = (email: string) => {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      return;
    }
    if (selectedKeys.has(`email:${normalized}`)) {
      setQuery("");
      return;
    }
    const matchedUser = usersWithEmail.find(
      (user) => user.email.toLowerCase() === normalized
    );
    if (matchedUser) {
      addUser(matchedUser);
      return;
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
    const loaded = await ensureUsersLoaded();
    const loadedWithEmail = loaded.filter((user) => Boolean(user.email?.trim()));
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
              void ensureUsersLoaded();
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
                  addExternal(query);
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

      {isFocused && (suggestions.length > 0 || EMAIL_REGEX.test(query.trim())) ? (
        <div className="rounded-lg border border-border bg-popover p-1 shadow-md">
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
          {suggestions.length === 0 && EMAIL_REGEX.test(query.trim()) ? (
            <button
              type="button"
              className="flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              onMouseDown={(event) => {
                event.preventDefault();
                addExternal(query);
              }}
            >
              Add {query.trim().toLowerCase()}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {isLoadingUsers ? (
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
            disabled={disabled || isLoadingUsers}
            onClick={() => void applyBulk(option.roles)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
