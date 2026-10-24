"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Home, LogOut, Settings } from "lucide-react";
import { logoutAction } from "@/app/(public)/auth/actions";
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground outline-none transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50",
          className
        )}
        aria-label="Account menu"
      >
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
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
  );
}
