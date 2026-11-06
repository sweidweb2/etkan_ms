import { PanelPageHeader } from "@/components/panels/panel-page-header";

/**
 * Admin panel placeholder.
 *
 * Admin has no dedicated product home. Shared workshop links appear in the
 * sidebar only when the user is an instructor (`ADMIN_PANEL_NAVIGATION`).
 * Do not redirect to `/manager/workshops` here — that path requires the
 * instructor flag and would loop for admins without it.
 */
export default function AdminPage() {
  return (
    <PanelPageHeader title="Admin" />
  );
}
