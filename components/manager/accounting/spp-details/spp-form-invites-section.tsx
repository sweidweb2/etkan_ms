import { format } from "date-fns";
import { CopyIcon, FileTextIcon, LinkIcon, Trash2Icon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type { ManagerFinancialFormInviteRow } from "@/types/manager-financial-adjustment";
import type { ManagerSppDetail } from "@/types/manager-student-payment";

type SppFormInvitesSectionProps = {
  spp: ManagerSppDetail;
  invites: ManagerFinancialFormInviteRow[];
  isInviteActionPending: boolean;
  onGenerateInvite: () => void;
  onCopyInviteUrl: (url: string) => void;
  onOpenWhatsApp: (url: string) => void;
  onDeleteInvite: (invite: ManagerFinancialFormInviteRow) => void;
};

export function SppFormInvitesSection({
  spp,
  invites,
  isInviteActionPending,
  onGenerateInvite,
  onCopyInviteUrl,
  onOpenWhatsApp,
  onDeleteInvite,
}: SppFormInvitesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial form invites</CardTitle>
        {!spp.adjustments_blocked ? (
          <CardAction>
            <Can permission={PERMISSIONS.ACCOUNTING_ADJUSTMENTS_UPDATE}>
              <Button
                type="button"
                size="sm"
                onClick={onGenerateInvite}
                disabled={isInviteActionPending}
              >
                {isInviteActionPending ? (
                  <InlineSpinner />
                ) : (
                  <LinkIcon data-icon="inline-start" />
                )}
                Generate invite link
              </Button>
            </Can>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          One-shot public links. Each link expires after the first submission.
        </p>
        {invites.length === 0 ? (
          <EmptyState
            size="sm"
            icon={FileTextIcon}
            title="No invite links yet"
            description="Generate a one-shot public link for financial form submission."
          />
        ) : (
          <ul className="space-y-2">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-col gap-2 rounded-lg border px-3 py-2 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {invite.is_used ? "Used" : "Active"} ·{" "}
                    {format(new Date(invite.created_at), "MMM d, yyyy HH:mm")}
                  </p>
                  {!invite.is_used ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {invite.url}
                    </p>
                  ) : null}
                </div>
                {!invite.is_used && !spp.adjustments_blocked ? (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void onCopyInviteUrl(invite.url)}
                    >
                      <CopyIcon data-icon="inline-start" />
                      Copy
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenWhatsApp(invite.url)}
                    >
                      WhatsApp
                    </Button>
                    <Can permission={PERMISSIONS.ACCOUNTING_ADJUSTMENTS_DELETE}>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label="Delete invite link"
                        onClick={() => onDeleteInvite(invite)}
                      >
                        <Trash2Icon data-icon="inline-start" />
                        Delete
                      </Button>
                    </Can>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
