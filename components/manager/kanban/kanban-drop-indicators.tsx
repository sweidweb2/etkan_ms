export function KanbanCardDropIndicator() {
  return (
    <div className="relative my-0.5 h-0 w-full shrink-0" aria-hidden>
      <div className="absolute inset-x-1 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]" />
      <div className="absolute top-1/2 left-0 size-2 -translate-y-1/2 rounded-full bg-primary" />
      <div className="absolute top-1/2 right-0 size-2 -translate-y-1/2 rounded-full bg-primary" />
    </div>
  );
}

export function KanbanColumnDropIndicator() {
  return (
    <div className="relative w-0 shrink-0 self-stretch" aria-hidden>
      <div className="absolute top-0 bottom-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]" />
      <div className="absolute top-0 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
      <div className="absolute bottom-0 left-1/2 size-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-primary" />
    </div>
  );
}
