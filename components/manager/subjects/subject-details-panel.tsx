"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ExternalLinkIcon, PencilIcon } from "lucide-react";
import { EditSubjectDialog } from "@/components/manager/subjects/edit-subject-dialog";
import { SubjectClassStudentGradesSection } from "@/components/manager/subjects/subject-class-student-grades-section";
import { SubjectClassesSection } from "@/components/manager/subjects/subject-classes-section";
import { SubjectCollapsibleSection } from "@/components/manager/subjects/subject-collapsible-section";
import { SubjectGradesSection } from "@/components/manager/subjects/subject-grades-section";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getManagerSubjectClassesPreview } from "@/lib/constants/manager-subject-classes-mock";
import { getManagerSubjectPreview } from "@/lib/manager/get-manager-subject-preview";
import { ROUTES } from "@/lib/constants/routes";
import type { ManagerSubjectRow } from "@/types/manager-subject";

type SubjectDetailsPanelProps = {
  subjectId: string;
};

function DetailField({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{children ?? value ?? "—"}</dd>
    </div>
  );
}

function DetailLink({
  href,
  label,
}: {
  href: string | null;
  label: string;
}) {
  if (!href) {
    return <DetailField label={label} value="—" />;
  }

  return (
    <DetailField label={label}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
      >
        Open link
        <ExternalLinkIcon className="size-3.5 shrink-0" />
      </a>
    </DetailField>
  );
}

export function SubjectDetailsPanel({ subjectId }: SubjectDetailsPanelProps) {
  const [subject, setSubject] = useState<ManagerSubjectRow>(() =>
    getManagerSubjectPreview(subjectId)
  );
  const [isEditOpen, setIsEditOpen] = useState(false);

  const classes = useMemo(
    () => getManagerSubjectClassesPreview(subject.id),
    [subject.id]
  );

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_SUBJECTS}>
              Manage subjects
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{subject.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <EditSubjectDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        subject={subject}
        onUpdateSubject={setSubject}
      />

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/50 py-4">
          <CardTitle className="text-xl">{subject.name}</CardTitle>
          <CardAction className="self-center">
            <Button type="button" onClick={() => setIsEditOpen(true)}>
              <PencilIcon data-icon="inline-start" />
              Edit subject
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="py-6">
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField label="Name" value={subject.name} />
            <DetailLink label="Syllabus" href={subject.syllabus_link} />
            <DetailLink label="Reference" href={subject.reference_link} />
            <DetailLink label="Handout" href={subject.handout_link} />
            <DetailField label="Classes" value={String(classes.length)} />
            <DetailField
              label="Created"
              value={format(new Date(subject.created_at), "MMM d, yyyy 'at' h:mm a")}
            />
          </dl>
        </CardContent>
      </Card>

      <SubjectCollapsibleSection
        title="Classes"
        description="Browse and filter classes in this subject."
        defaultOpen
      >
        <SubjectClassesSection classes={classes} subjectName={subject.name} />
      </SubjectCollapsibleSection>

      <SubjectCollapsibleSection
        title="Grades overview"
        description="Class averages and subject-wide performance."
        defaultOpen={false}
      >
        {(open) => <SubjectGradesSection classes={classes} visible={open} />}
      </SubjectCollapsibleSection>

      <SubjectCollapsibleSection
        title="Student grades"
        description="Per-student grades by class."
        defaultOpen={false}
      >
        {(open) => (
          <SubjectClassStudentGradesSection
            classes={classes}
            subjectName={subject.name}
            visible={open}
          />
        )}
      </SubjectCollapsibleSection>
    </div>
  );
}
