"use client";

import { useState } from "react";
import { DicesIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { generateStrongPassword } from "@/lib/utils/generate-strong-password";
import { cn } from "@/lib/utils";

type PasswordInputProps = React.ComponentProps<typeof Input> & {
  /** When set, shows a generate icon that fills a strong random password. */
  onGeneratePassword?: (password: string) => void;
};

export function PasswordInput({
  className,
  disabled,
  onGeneratePassword,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const canGenerate = typeof onGeneratePassword === "function";

  function handleGenerate() {
    if (!onGeneratePassword || disabled) {
      return;
    }

    const password = generateStrongPassword();
    onGeneratePassword(password);
    setVisible(true);
  }

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn(canGenerate ? "pr-16" : "pr-9", className)}
        disabled={disabled}
        {...props}
      />
      <div className="absolute top-1/2 right-2.5 flex -translate-y-1/2 items-center gap-1">
        {canGenerate ? (
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={handleGenerate}
            className="rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
            aria-label="Generate strong password"
            title="Generate strong password"
          >
            <DicesIcon className="size-4" aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
          className="rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <EyeOffIcon className="size-4" aria-hidden="true" />
          ) : (
            <EyeIcon className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
