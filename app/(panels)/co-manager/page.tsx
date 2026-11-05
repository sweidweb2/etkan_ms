import { PanelPageHeader } from "@/components/panels/panel-page-header";

/**
 * Co-manager panel placeholder.
 *
 * Co-manager has no dedicated product home beyond optional shared workshops
 * (`CO_MANAGER_PANEL_NAVIGATION`). Do not redirect to `/manager/workshops` —
 * that path requires instructor/mentor and would loop without the flag.
 */
export default function CoManagerPage() {
  return (
    <PanelPageHeader title="Co-manager" />
  );
}
