"use client";

import { ClassFollowUpBoard } from "@/components/manager/classes/follow-up/class-follow-up-board";
import { PanelPageHeader } from "@/components/panels/panel-page-header";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  CLASS_STATUS_BADGE_CLASSES,
  CLASS_STATUS_LABELS,
} from "@/lib/constants/manager-subject-display";
import {
  getManagerClassDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { FollowUpBoardState } from "@/lib/classes/follow-up-state";
import type { ManagerCategoryRow } from "@/types/manager-category";
import type { ManagerClassRow } from "@/types/manager-class-list";

type ClassFollowUpPanelProps = {
  classRow: ManagerClassRow;
  categories: ManagerCategoryRow[];
  board: FollowUpBoardState;
};

export function ClassFollowUpPanel({
  classRow,
  categories,
  board,
}: ClassFollowUpPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader title={classRow.name} />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_CLASSES}>
              Manage classes
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={getManagerClassDetailRoute(classRow.id)}>
              {classRow.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Category follow-up</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
            CLASS_STATUS_BADGE_CLASSES[classRow.status]
          )}
        >
          {CLASS_STATUS_LABELS[classRow.status]}
        </span>
      </div>

      <ClassFollowUpBoard
        classId={classRow.id}
        categories={categories}
        initialBoard={board}
      />
    </div>
  );
}
