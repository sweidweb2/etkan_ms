"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  className?: string;
};

export function SignOutButton({ className }: SignOutButtonProps) {
  const [isPending, startTransition] = useTransition();
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  function handleSignOut() {
    startTransition(async () => {
      await logoutAction();
    });
  }

  const label = isPending ? "Signing out…" : "Sign out";

  const button = (
    <Button
      type="button"
      variant="outline"
      size={isCollapsed ? "icon" : "sm"}
      className={cn(isCollapsed ? "size-8 shrink-0" : "w-full", className)}
      disabled={isPending}
      onClick={handleSignOut}
      aria-label={isCollapsed ? label : undefined}
    >
      {isCollapsed ? <LogOut className="size-4" /> : label}
    </Button>
  );

  if (!isCollapsed) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="right" align="center">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
