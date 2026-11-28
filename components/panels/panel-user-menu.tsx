"use client";

import { useState } from "react";
import Link from "next/link";
import { Home, LogOut, Settings } from "lucide-react";
import { logoutAction } from "@/app/(public)/auth/actions";
import { usePanelSessionAvatarUrl } from "@/components/panels/panel-session-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { broadcastSessionEnded } from "@/lib/auth/session-cross-tab";
import { ROUTES } from "@/lib/constants/routes";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils/display-name";
import { cn } from "@/lib/utils";

type PanelUserMenuProps = {
  displayName: string;
  className?: string;
  /** Optional settings link (e.g. teacher settings). */
  settingsHref?: string;
};

const LOGOUT_FORM_ID = "panel-logout-form";

function UserAvatarFace({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl: string | null;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (avatarUrl && failedUrl !== avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- public Storage URL, already a 512px WebP
      <img
        src={avatarUrl}
        alt=""
        className="size-full rounded-full object-cover"
        onError={() => setFailedUrl(avatarUrl)}
      />
    );
  }

  return getInitials(displayName);
}

function notifySignedOut() {
  broadcastSessionEnded("signed_out");
  // Clear the browser client session so it cannot refresh cookies after the
  // server action redirect (which would bounce login → panel).
  void getBrowserSupabaseClient().auth.signOut({ scope: "local" });
}

export function PanelUserMenu({
  displayName,
  className,
  settingsHref,
}: PanelUserMenuProps) {
  const avatarUrl = usePanelSessionAvatarUrl();
  const avatarFace = (
    <UserAvatarFace displayName={displayName} avatarUrl={avatarUrl} />
  );

  const avatarClassName = cn(
    "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-primary-foreground outline-none transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50",
    className
  );

  return (
    <>
      {/* Progressive-enhancement form so redirect() from logoutAction is applied. */}
      <form
        id={LOGOUT_FORM_ID}
        action={logoutAction}
        onSubmit={notifySignedOut}
        className="hidden"
        aria-hidden
      />

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
          type="submit"
          form={LOGOUT_FORM_ID}
          variant="ghost"
          size="icon"
          aria-label="Log out"
        >
          <LogOut />
        </Button>
        {settingsHref ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={avatarClassName}
              aria-label="Account menu"
            >
              {avatarFace}
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
            {avatarFace}
          </span>
        )}
      </div>

      <div className="hidden md:block">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={avatarClassName}
            aria-label="Account menu"
          >
            {avatarFace}
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
            <DropdownMenuItem asChild>
              <button type="submit" form={LOGOUT_FORM_ID}>
                <LogOut />
                Log out
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
