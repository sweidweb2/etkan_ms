"use client";

import { useMemo, useState } from "react";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EMAIL_REGEX } from "@/lib/validators/auth/fields";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { cn } from "@/lib/utils";
import type { ManagerUserRow } from "@/types/manager-user";

export type ComposeRecipient =
  | { kind: "user"; user: ManagerUserRow }
  | { kind: "external"; email: string };

type RecipientToFieldProps = {
  users: ManagerUserRow[];
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
  ];

function getUserDisplayName(user: ManagerUserRow) {
  return user.username ?? user.student_full_name ?? user.email;
}

function recipientKey(recipient: ComposeRecipient) {
  return recipient.kind === "user"
    ? `user:${recipient.user.id}`
    : `email:${recipient.email.toLowerCase()}`;
}

export function RecipientToField({
  users,
  recipients,
  onChange,
  disabled = false,
  invalid = false,
}: RecipientToFieldProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

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

  const applyBulk = (roles?: RoleValue[]) => {
    const pool = roles
      ? usersWithEmail.filter((user) => roles.includes(user.role))
      : usersWithEmail;

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
          "flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1.5",
          isFocused && !invalid && "border-ring ring-3 ring-ring/50",
          invalid && "border-destructive ring-3 ring-destructive/20"
        )}
        aria-invalid={invalid || undefined}
      >
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
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            window.setTimeout(() => setIsFocused(false), 150);
          }}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "," || event.key === ";") {
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

      <div className="flex flex-wrap gap-2">
        {BULK_OPTIONS.map((option) => (
          <Button
            key={option.id}
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => applyBulk(option.roles)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
