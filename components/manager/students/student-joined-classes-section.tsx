"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { removeStudentFromClassAction } from "@/app/manager/classes/actions";
import { Can } from "@/components/auth/can";
import {
  Tabs as TabsPrimitive,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { AssignStudentClassDialog } from "@/components/manager/students/assign-student-class-dialog";
import { ClassAttendanceSection } from "@/components/manager/students/class-attendance-section";
import { ClassCourseGradeSection } from "@/components/manager/students/class-course-grade-section";
import { ClassFinalExamStudentSection } from "@/components/manager/students/class-final-exam-student-section";
import { ClassGroupGradesSection } from "@/components/manager/students/class-group-grades-section";
import { ClassTasksSection } from "@/components/manager/students/class-tasks-section";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HorizontalScrollCarousel } from "@/components/ui/horizontal-scroll-carousel";
import {
  MANAGER_CLASS_STATUS_BADGE_CLASSES,
  MANAGER_CLASS_STATUS_DOT_CLASSES,
  MANAGER_CLASS_STATUS_LABELS,
} from "@/lib/constants/manager-class-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { cn } from "@/lib/utils";
import type { ManagerClassOption } from "@/types/manager-class";
import type { RemoveStudentFromClassActionState } from "@/types/manager-class-detail";
import type { ManagerStudentClassRow } from "@/types/manager-student-class";
import type { ManagerStudentClassAcademicBundle } from "@/types/manager-student-class-detail";

const initialRemoveState: RemoveStudentFromClassActionState = {};

type StudentJoinedClassesSectionProps = {
  studentProfileId: string;
  initialClasses: ManagerStudentClassRow[];
  availableClasses: ManagerClassOption[];
  classBundles: ManagerStudentClassAcademicBundle[];
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

function ClassStatusBadge({ status }: { status: ManagerStudentClassRow["class_status"] }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize",
        MANAGER_CLASS_STATUS_BADGE_CLASSES[status]
      )}
    >
      {MANAGER_CLASS_STATUS_LABELS[status]}
    </span>
  );
}

function ClassTabPanel({
  bundle,
  onRemove,
}: {
  bundle: ManagerStudentClassAcademicBundle;
  onRemove: () => void;
}) {
  const { classRow, detail, finalExam, studentFinalExamGrade } = bundle;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <dl className="grid gap-4 rounded-lg bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <ClassDetailField label="Class name" value={classRow.name} />
        <ClassDetailField label="Subject" value={classRow.subject_name} />
        <ClassDetailField label="Class status">
          <ClassStatusBadge status={classRow.class_status} />
        </ClassDetailField>
        <ClassDetailField
          label="Joined"
          value={format(new Date(classRow.joined_at), "MMM d, yyyy")}
        />
      </dl>

      <div className="flex justify-end">
        <Can permission={PERMISSIONS.CLASSES_REMOVE_STUDENT}>
          <Button type="button" variant="destructive" onClick={onRemove}>
            <Trash2Icon data-icon="inline-start" />
            Remove from class
          </Button>
        </Can>
      </div>

      <ClassAttendanceSection detail={detail} />
      <ClassGroupGradesSection groupGradeSlots={detail.groupGradeSlots} />
      <ClassFinalExamStudentSection
        finalExam={finalExam}
        studentFinalExamGrade={studentFinalExamGrade}
      />
      <ClassTasksSection detail={detail} />
      <ClassCourseGradeSection courseGrade={detail.courseGrade} />
    </div>
  );
}

export function StudentJoinedClassesSection({
  studentProfileId,
  initialClasses,
  availableClasses,
  classBundles,
}: StudentJoinedClassesSectionProps) {
  const router = useRouter();
  const [isTransitionPending, startTransition] = useTransition();
  const [removeState, removeAction, isRemovePending] = useActionState(
    removeStudentFromClassAction,
    initialRemoveState
  );
  const isPending = isRemovePending || isTransitionPending;

  useActionStateToast(removeState, isPending);

  const [classes, setClasses] = useState<ManagerStudentClassRow[]>(initialClasses);
  const [prevInitialClasses, setPrevInitialClasses] =
    useState<ManagerStudentClassRow[]>(initialClasses);
  const [bundles, setBundles] =
    useState<ManagerStudentClassAcademicBundle[]>(classBundles);
  const [prevClassBundles, setPrevClassBundles] =
    useState<ManagerStudentClassAcademicBundle[]>(classBundles);
  const [assignableClasses, setAssignableClasses] =
    useState(availableClasses);
  const [prevAvailableClasses, setPrevAvailableClasses] =
    useState(availableClasses);
  const [isAssignClassOpen, setIsAssignClassOpen] = useState(false);
  const [removingClass, setRemovingClass] =
    useState<ManagerStudentClassRow | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(
    () => classes[0]?.id ?? null
  );
  const resolvedActiveTab =
    classes.length === 0
      ? null
      : activeTab && classes.some((classRow) => classRow.id === activeTab)
        ? activeTab
        : classes[0]!.id;
  const activeTabRef = useRef<HTMLButtonElement | null>(null);

  const handleRemoveOpenChange = usePendingAwareOpenChange(
    isPending,
    (open) => {
      if (!open) {
        setRemovingClass(null);
      }
    }
  );

  if (initialClasses !== prevInitialClasses) {
    setPrevInitialClasses(initialClasses);
    setClasses(initialClasses);
  }

  if (classBundles !== prevClassBundles) {
    setPrevClassBundles(classBundles);
    setBundles(classBundles);
  }

  if (availableClasses !== prevAvailableClasses) {
    setPrevAvailableClasses(availableClasses);
    setAssignableClasses(availableClasses);
  }

  useActionStateSuccess(
    removeState,
    isPending,
    (nextState) => {
      if (!nextState.removedStudentId) {
        return;
      }

      const removedId = nextState.removedStudentId;
      const nextClasses = classes.filter((row) => row.id !== removedId);
      setClasses(nextClasses);
      setBundles((current) =>
        current.filter((bundle) => bundle.classRow.id !== removedId)
      );
      setRemovingClass(null);
      router.refresh();
    },
    (nextState) => Boolean(nextState.success && nextState.removedStudentId)
  );

  const activeBundle =
    bundles.find((bundle) => bundle.classRow.id === resolvedActiveTab) ??
    bundles[0] ??
    null;

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [resolvedActiveTab]);

  function handleConfirmRemove() {
    if (!removingClass) {
      return;
    }

    const formData = new FormData();
    formData.set("id", removingClass.id);
    formData.set("class_id", removingClass.class_id);

    startTransition(() => {
      removeAction(formData);
    });
  }

  return (
    <>
      <AssignStudentClassDialog
        open={isAssignClassOpen}
        onOpenChange={setIsAssignClassOpen}
        studentProfileId={studentProfileId}
        availableClasses={assignableClasses}
        onAssigned={() => {
          router.refresh();
        }}
      />

      <Dialog
        open={removingClass !== null}
        onOpenChange={handleRemoveOpenChange}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>Remove from class</DialogTitle>
            <DialogDescription>
              Remove this student from {removingClass?.name ?? "this class"}?
              Membership ends; billing and payment phase records are kept if
              any exist. Academic history (tasks, attendance, grades) remains.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleRemoveOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmRemove}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <InlineSpinner />
                  Removing
                </>
              ) : (
                "Remove"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="min-w-0 max-w-full overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <CardTitle>Joined classes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Select a class below. Use arrows or drag to browse memberships.
          </p>
          <CardAction className="self-center">
            <Can permission={PERMISSIONS.CLASSES_ADD_STUDENT}>
              <Button type="button" onClick={() => setIsAssignClassOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                Assign class
              </Button>
            </Can>
          </CardAction>
        </CardHeader>
        <CardContent className="min-w-0 max-w-full overflow-hidden px-0 pb-0">
          {classes.length === 0 ? (
            <div className="min-w-0 max-w-full border-b bg-muted/25 px-4 py-3">
              <p className="rounded-xl bg-muted/60 px-4 py-8 text-center text-sm text-muted-foreground ring-1 ring-foreground/8">
                No classes assigned yet. Use Assign class to add this student.
              </p>
            </div>
          ) : (
            <TabsPrimitive
              value={resolvedActiveTab ?? classes[0]!.id}
              onValueChange={setActiveTab}
              className="flex min-w-0 max-w-full flex-col gap-0"
            >
              <div className="min-w-0 max-w-full border-b bg-muted/25 px-4 py-3 sm:px-5">
                <HorizontalScrollCarousel
                  ariaLabel="Student class tabs"
                  className="rounded-xl bg-muted/60 px-1 py-2 ring-1 ring-foreground/8 sm:px-2"
                  contentClassName="px-1 py-1"
                  navButtonClassName="size-8 rounded-full text-muted-foreground hover:bg-background/80 hover:text-foreground disabled:opacity-30"
                >
                  <TabsListPrimitive className="mx-1 my-1 inline-flex h-auto w-max max-w-none flex-nowrap items-center gap-2 bg-transparent p-0">
                    {classes.map((classRow) => (
                      <TabsTriggerPrimitive
                        key={classRow.id}
                        ref={
                          resolvedActiveTab === classRow.id
                            ? activeTabRef
                            : undefined
                        }
                        value={classRow.id}
                        className={cn(
                          "group inline-flex max-w-none shrink-0 flex-none items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-200",
                          "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground hover:shadow-sm",
                          "data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:ring-2 data-[state=active]:ring-offset-2 data-[state=active]:ring-offset-muted/60 data-[state=active]:ring-border/40",
                          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        )}
                      >
                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            MANAGER_CLASS_STATUS_DOT_CLASSES[
                              classRow.class_status
                            ]
                          )}
                          aria-hidden="true"
                        />
                        <span className="flex flex-col items-start leading-tight">
                          <span className="whitespace-nowrap">{classRow.name}</span>
                          <span className="text-[10px] font-normal text-muted-foreground group-data-[state=active]:text-foreground/70">
                            {
                              MANAGER_CLASS_STATUS_LABELS[
                                classRow.class_status
                              ]
                            }
                          </span>
                        </span>
                      </TabsTriggerPrimitive>
                    ))}
                  </TabsListPrimitive>
                </HorizontalScrollCarousel>
              </div>

              {activeBundle ? (
                <div className="min-w-0 px-4 py-6">
                  <ClassTabPanel
                    bundle={activeBundle}
                    onRemove={() => setRemovingClass(activeBundle.classRow)}
                  />
                </div>
              ) : null}
            </TabsPrimitive>
          )}
        </CardContent>
      </Card>
    </>
  );
}
