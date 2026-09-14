/**
 * Teacher panel placeholder.
 *
 * Dedicated teacher product routes are not built yet. Navigation is empty
 * except optional shared workshop links when the user is an instructor/mentor
 * (`TEACHER_PANEL_NAVIGATION` / `withManageWorkshops`).
 */
export default function TeacherPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Teacher</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Teacher-specific pages are not available yet. If you teach workshops,
        open Manage workshops from the sidebar when it appears.
      </p>
    </div>
  );
}
