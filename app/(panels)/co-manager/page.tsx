/**
 * Co-manager panel placeholder.
 *
 * Co-manager has no dedicated product home beyond optional shared workshops
 * (`CO_MANAGER_PANEL_NAVIGATION`). Do not redirect to `/manager/workshops` —
 * that path requires instructor/mentor and would loop without the flag.
 */
export default function CoManagerPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Co-manager</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        No dedicated co-manager sections yet. If you teach workshops, open
        Manage workshops from the sidebar when it appears.
      </p>
    </div>
  );
}
