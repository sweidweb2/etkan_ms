"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  Tabs as TabsPrimitive,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { ClassAttendanceSection } from "@/components/manager/students/class-attendance-section";
import { ClassCourseGradeSection } from "@/components/manager/students/class-course-grade-section";
import { ClassTasksSection } from "@/components/manager/students/class-tasks-section";
import { StudentClassStatusBadge } from "@/components/manager/students/student-class-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HorizontalScrollCarousel } from "@/components/ui/horizontal-scroll-carousel";
import {
  MANAGER_STUDENT_CLASS_TAB_ACTIVE_RING,
  MANAGER_STUDENT_CLASS_TAB_STATUS_DOT,
  MANAGER_STUDENT_CLASS_STATUS_LABELS,
} from "@/lib/constants/manager-student-class-display";
import { getManagerStudentClassesPreview } from "@/lib/manager/get-manager-student-classes-preview";
import { getManagerStudentPreview } from "@/lib/manager/get-manager-student-preview";
import { cn } from "@/lib/utils";
import type { ManagerStudentClassRow } from "@/types/manager-student-class";

type StudentJoinedClassesSectionProps = {
  studentProfileId: string;
};

function ClassDetailField({
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

function ClassTabPanel({
  classRow,
  userId,
}: {
  classRow: ManagerStudentClassRow;
  userId: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <dl className="grid gap-4 rounded-lg bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <ClassDetailField label="Class name" value={classRow.name} />
        <ClassDetailField label="Subject" value={classRow.subject_name} />
        <ClassDetailField label="Status">
          <StudentClassStatusBadge status={classRow.status} />
        </ClassDetailField>
        <ClassDetailField
          label="Joined"
          value={format(new Date(classRow.joined_at), "MMM d, yyyy")}
        />
      </dl>

      <ClassAttendanceSection userId={userId} classId={classRow.class_id} />
      <ClassTasksSection userId={userId} classId={classRow.class_id} />
      <ClassCourseGradeSection userId={userId} classId={classRow.class_id} />
    </div>
  );
}

export function StudentJoinedClassesSection({
  studentProfileId,
}: StudentJoinedClassesSectionProps) {
  const classes = getManagerStudentClassesPreview(studentProfileId);
  const student = getManagerStudentPreview(studentProfileId);

  if (classes.length === 0) {
    return (
      <Card className="min-w-0 max-w-full overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/40 py-4">
          <CardTitle>Joined classes</CardTitle>
        </CardHeader>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          This student is not enrolled in any classes yet.
        </CardContent>
      </Card>
    );
  }

  const defaultTab = classes[0]!.id;
  const [activeTab, setActiveTab] = useState(defaultTab);
  const activeTabRef = useRef<HTMLButtonElement | null>(null);
  const activeClass =
    classes.find((classRow) => classRow.id === activeTab) ?? classes[0]!;

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [activeTab]);

  return (
    <Card className="min-w-0 max-w-full overflow-hidden py-0">
      <CardHeader className="border-b bg-muted/40 py-4">
        <CardTitle>Joined classes</CardTitle>
        <p className="text-sm text-muted-foreground">
          Select a class below. Use arrows or drag to browse enrolled classes.
        </p>
      </CardHeader>
      <CardContent className="min-w-0 max-w-full overflow-hidden px-0 pb-0">
        <TabsPrimitive
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-w-0 max-w-full flex-col gap-0"
        >
          <div className="min-w-0 max-w-full overflow-hidden border-b bg-muted/25 px-4 py-3">
            <HorizontalScrollCarousel
              ariaLabel="Student class tabs"
              className="rounded-xl bg-muted/60 p-2 ring-1 ring-foreground/8"
              navButtonClassName="size-8 rounded-full text-muted-foreground hover:bg-background/80 hover:text-foreground disabled:opacity-30"
            >
              <TabsListPrimitive className="my-1 inline-flex h-auto w-max max-w-none flex-nowrap items-center gap-2 bg-transparent p-0">
                {classes.map((classRow) => (
                  <TabsTriggerPrimitive
                    key={classRow.id}
                    ref={
                      activeTab === classRow.id
                        ? activeTabRef
                        : undefined
                    }
                    value={classRow.id}
                    className={cn(
                      "group inline-flex max-w-none shrink-0 flex-none items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-200",
                      "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground hover:shadow-sm",
                      "data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:ring-2 data-[state=active]:ring-offset-2 data-[state=active]:ring-offset-muted/60",
                      "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      MANAGER_STUDENT_CLASS_TAB_ACTIVE_RING[classRow.status]
                    )}
                  >
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        MANAGER_STUDENT_CLASS_TAB_STATUS_DOT[classRow.status]
                      )}
                      aria-hidden="true"
                    />
                    <span className="flex flex-col items-start leading-tight">
                      <span className="whitespace-nowrap">{classRow.name}</span>
                      <span className="text-[10px] font-normal text-muted-foreground group-data-[state=active]:text-foreground/70">
                        {MANAGER_STUDENT_CLASS_STATUS_LABELS[classRow.status]}
                      </span>
                    </span>
                  </TabsTriggerPrimitive>
                ))}
              </TabsListPrimitive>
            </HorizontalScrollCarousel>
          </div>

          <div className="min-w-0 px-4 py-6">
            <ClassTabPanel classRow={activeClass} userId={student.user_id} />
          </div>
        </TabsPrimitive>
      </CardContent>
    </Card>
  );
}
