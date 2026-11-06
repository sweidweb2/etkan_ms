import type { ReactNode } from "react";
import Link from "next/link";
import { EyeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const MANAGER_CARD_GRID_CLASS_NAME =
  "grid grid-cols-2 gap-4 @2xl/panel:grid-cols-3 @4xl/panel:grid-cols-4 @6xl/panel:grid-cols-5";

export const GRID_CARD_ACTION_BUTTON_CLASS_NAME =
  "relative z-10 size-7 bg-background pointer-events-auto hover:border-primary/40 hover:bg-background hover:text-primary";

type GridCardBodyProps = {
  title: string;
  subtitle?: ReactNode;
};

export function GridCardBody({ title, subtitle }: GridCardBodyProps) {
  return (
    <div className="pointer-events-none relative z-10 flex min-h-28 flex-1 flex-col items-center justify-center gap-1 px-4 py-5">
      <h3
        className="line-clamp-2 text-center text-sm font-semibold leading-snug tracking-tight break-words"
        title={title}
      >
        {title}
      </h3>
      {subtitle ? (
        <p className="line-clamp-1 max-w-full text-center text-xs text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

type GridCardFooterProps = {
  meta: ReactNode;
  actions: ReactNode;
  className?: string;
};

export function GridCardFooter({ meta, actions, className }: GridCardFooterProps) {
  return (
    <div
      className={cn(
        "pointer-events-none relative z-10 flex items-center justify-between gap-1.5 border-t border-border px-2.5 py-2",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        {meta}
      </div>
      <div className="flex shrink-0 items-center gap-1">{actions}</div>
    </div>
  );
}

type GridCardViewButtonProps = {
  href: string;
  label: string;
};

export function GridCardViewButton({ href, label }: GridCardViewButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon-sm"
      className={GRID_CARD_ACTION_BUTTON_CLASS_NAME}
      aria-label={label}
      nativeButton={false}
      render={<Link href={href} prefetch={false} />}
    >
      <EyeIcon className="size-3.5" />
    </Button>
  );
}
