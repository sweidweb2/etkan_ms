"use client";

import { HashIcon, PencilIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import {
  GRID_CARD_ACTION_BUTTON_CLASS_NAME,
  GridCardBody,
  GridCardFooter,
  GridCardViewButton,
} from "@/components/manager/shared/grid-card";
import { Button } from "@/components/ui/button";
import { FrostedGlassCard } from "@/components/ui/frosted-glass-card";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerSemesterDetailRoute } from "@/lib/constants/routes";
import type { ManagerSemesterRow } from "@/types/manager-phase";

type PhaseCardProps = {
  phase: ManagerSemesterRow;
  onEdit?: (phase: ManagerSemesterRow) => void;
};

export function PhaseCard({ phase, onEdit }: PhaseCardProps) {
  const href = getManagerSemesterDetailRoute(phase.id);

  return (
    <FrostedGlassCard href={href} hrefAriaLabel={`View semester ${phase.name}`}>
      <GridCardBody title={phase.name} />
      <GridCardFooter
        meta={
          <>
            <HashIcon className="size-3.5 shrink-0" aria-hidden />
            <span className="sr-only">Semester code</span>
            <span className="truncate font-mono font-medium tracking-wider text-foreground tabular-nums">
              {phase.semester_code}
            </span>
          </>
        }
        actions={
          <>
            {onEdit ? (
              <Can permission={PERMISSIONS.SEMESTERS_UPDATE}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className={GRID_CARD_ACTION_BUTTON_CLASS_NAME}
                  aria-label={`Edit semester ${phase.name}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onEdit(phase);
                  }}
                >
                  <PencilIcon className="size-3.5" />
                </Button>
              </Can>
            ) : null}
            <GridCardViewButton
              href={href}
              label={`View semester ${phase.name}`}
            />
          </>
        }
      />
    </FrostedGlassCard>
  );
}
