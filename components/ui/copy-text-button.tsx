"use client";

import { useState, type MouseEvent } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type CopyTextButtonProps = {
  value: string;
  label?: string;
  successMessage?: string;
  errorMessage?: string;
  className?: string;
};

export function CopyTextButton({
  value,
  label = "Copy",
  successMessage = "Copied to clipboard.",
  errorMessage = "Unable to copy.",
  className,
}: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);
  const trimmed = value.trim();

  async function handleCopy(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    event.preventDefault();

    if (!trimmed) {
      showErrorToast(errorMessage);
      return;
    }

    try {
      await navigator.clipboard.writeText(trimmed);
      setCopied(true);
      showSuccessToast(successMessage);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      showErrorToast(errorMessage);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className={cn(
              "size-6 shrink-0 text-muted-foreground hover:bg-primary/15 hover:text-primary",
              className
            )}
            aria-label={label}
            disabled={!trimmed}
            onClick={(event) => {
              void handleCopy(event);
            }}
          />
        }
      >
        {copied ? (
          <CheckIcon className="size-3.5" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied" : label}</TooltipContent>
    </Tooltip>
  );
}
