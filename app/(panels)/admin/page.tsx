/**
 * Admin panel placeholder.
 *
 * Admin has no dedicated product home. Shared workshop links appear in the
 * sidebar only when the user is an instructor/mentor (`ADMIN_PANEL_NAVIGATION`).
 * Do not redirect to `/manager/workshops` here — that path requires the
 * instructor/mentor flag and would loop for admins without it.
 */
export default function AdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        No dedicated admin sections yet. If you teach workshops, open Manage
        workshops from the sidebar when it appears.
      </p>
    </div>
  );
}
