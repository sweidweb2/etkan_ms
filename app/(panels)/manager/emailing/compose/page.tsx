import { ComposeLetterPanel } from "@/components/manager/emailing/compose-letter-panel";

/**
 * Recipient list is no longer loaded on every compose visit — the To field
 * fetches it (tag-cached) on first focus / bulk-role click.
 */
export default function ManagerEmailingComposePage() {
  return <ComposeLetterPanel />;
}
