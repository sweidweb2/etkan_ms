"use client";

import { format } from "date-fns";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { WorkshopSessionsSection } from "@/components/instructor/workshops/workshop-sessions-section";
import { WorkshopStatusBadge } from "@/components/manager/workshops/workshop-status-badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  MANAGER_WORKSHOP_STATUS_LABELS,
  WORKSHOP_OFFERING_TYPE_LABELS,
} from "@/lib/constants/manager-workshop-display";
import { ROUTES } from "@/lib/constants/routes";
import type {
  ManagerWorkshopRow,
  ManagerWorkshopSessionRow,
} from "@/types/manager-workshop";

type InstructorWorkshopDetailsPanelProps = {
  workshop: ManagerWorkshopRow;
  sessions: ManagerWorkshopSessionRow[];
  assignmentRole: string;
};

function DetailField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

function formatMoney(value: number | null) {
  if (value == null) {
    return "—";
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }
  return format(new Date(value), "MMM d, yyyy");
}

export function InstructorWorkshopDetailsPanel({
  workshop,
  sessions,
  assignmentRole,
}: InstructorWorkshopDetailsPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb className="min-w-0">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.INSTRUCTOR_WORKSHOPS}>
              My workshops
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{workshop.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{workshop.name}</h1>
        <WorkshopStatusBadge status={workshop.status} />
      </div>

      <ClassTabCollapsibleSection title="Details" defaultOpen>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField label="Type" value={WORKSHOP_OFFERING_TYPE_LABELS[workshop.type]} />
          <DetailField
            label="Status"
            value={MANAGER_WORKSHOP_STATUS_LABELS[workshop.status]}
          />
          <DetailField label="Your role" value={assignmentRole} />
          <DetailField label="Subject" value={workshop.subject} />
          <DetailField label="Target audience" value={workshop.target_audience} />
          <DetailField
            label="Participants"
            value={
              workshop.nb_participants != null
                ? String(workshop.nb_participants)
                : null
            }
          />
          <DetailField label="Sessions" value={
            workshop.number_of_sessions != null
              ? String(workshop.number_of_sessions)
              : null
          } />
          <DetailField label="Price" value={formatMoney(workshop.price)} />
          <DetailField label="Phone" value={workshop.phone} />
          <DetailField label="Place" value={workshop.delivery_place} />
          <DetailField label="Start" value={formatDate(workshop.start_date)} />
          <DetailField label="End" value={formatDate(workshop.end_date)} />
          <DetailField label="Proposal notes" value={workshop.proposal_notes} />
        </dl>
      </ClassTabCollapsibleSection>

      <WorkshopSessionsSection workshopId={workshop.id} sessions={sessions} />
    </div>
  );
}
