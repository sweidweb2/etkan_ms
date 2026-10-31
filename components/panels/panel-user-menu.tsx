"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Home, LogOut, Settings } from "lucide-react";
import { logoutAction } from "@/app/(public)/auth/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/lib/constants/routes";
import { getInitials } from "@/lib/utils/display-name";
import { cn } from "@/lib/utils";

type PanelUserMenuProps = {
  displayName: string;
  className?: string;
  /** Optional settings link (e.g. teacher settings). */
  settingsHref?: string;
};

export function PanelUserMenu({
  displayName,
  className,
  settingsHref,
}: PanelUserMenuProps) {
  const [isPending, startTransition] = useTransition();
  const initials = getInitials(displayName);

  function handleSignOut() {
    startTransition(async () => {
      await logoutAction();
    });
  }

  const avatarClassName = cn(
    "flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground outline-none transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50",
    className
  );

  return (
    <>
      <div className="flex items-center gap-1 md:hidden">
        <Button
          render={<Link href={ROUTES.HOME} />}
          nativeButton={false}
          variant="ghost"
          size="icon"
          aria-label="Go to home"
        >
          <Home />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={isPending}
          aria-label={isPending ? "Signing out" : "Log out"}
          onClick={handleSignOut}
        >
          <LogOut />
        </Button>
        {settingsHref ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={avatarClassName}
              aria-label="Account menu"
            >
              {initials}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="truncate">
                {displayName}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={settingsHref} prefetch={false}>
                  <Settings />
                  Settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span
            className={cn(avatarClassName, "pointer-events-none")}
            aria-label={displayName}
            title={displayName}
          >
            {initials}
          </span>
        )}
      </div>

      <div className="hidden md:block">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={avatarClassName}
            aria-label="Account menu"
          >
            {initials}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="truncate">
              {displayName}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {settingsHref ? (
              <DropdownMenuItem asChild>
                <Link href={settingsHref} prefetch={false}>
                  <Settings />
                  Settings
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem asChild>
              <Link href={ROUTES.HOME}>
                <Home />
                Go to home
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isPending} onClick={handleSignOut}>
              <LogOut />
              {isPending ? "Signing out…" : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
