"use client";

import { useEffect, useMemo, useState } from "react";
import { FieldLabel } from "@/components/auth/field-label";
import { StudentFastCertificateContent } from "@/components/manager/classes/student-fast-certificate-section";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showErrorToast } from "@/lib/toast";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassStudentGradeRow } from "@/types/manager-class-student-grade";
import {
  fetchStudentFastCertificateBundleAction,
  type StudentFastCertificateBundle,
} from "@/app/manager/classes/grades/actions";

type ClassFastCertificatePanelProps = {
  classId: string;
  classRow: ManagerClassRow;
  studentRows: ManagerClassStudentGradeRow[];
};

export function ClassFastCertificatePanel({
  classId,
  classRow,
  studentRows,
}: ClassFastCertificatePanelProps) {
  const sortedStudents = useMemo(
    () =>
      [...studentRows].sort((left, right) =>
        left.full_name.localeCompare(right.full_name)
      ),
    [studentRows]
  );

  const [selectedStudentProfileId, setSelectedStudentProfileId] = useState("");
  const [bundle, setBundle] = useState<StudentFastCertificateBundle | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  const selectedStudent = useMemo(
    () =>
      sortedStudents.find(
        (row) => row.student_profile_id === selectedStudentProfileId
      ) ?? null,
    [selectedStudentProfileId, sortedStudents]
  );

  useEffect(() => {
    if (
      selectedStudentProfileId &&
      !sortedStudents.some(
        (row) => row.student_profile_id === selectedStudentProfileId
      )
    ) {
      setSelectedStudentProfileId("");
    }
  }, [selectedStudentProfileId, sortedStudents]);

  useEffect(() => {
    if (!selectedStudentProfileId) {
      setBundle(null);
      return;
    }

    let cancelled = false;

    async function loadBundle() {
      setIsLoading(true);

      try {
        const result = await fetchStudentFastCertificateBundleAction(
          classId,
          selectedStudentProfileId
        );

        if (cancelled) {
          return;
        }

        if (!result.success || !result.bundle) {
          setBundle(null);
          showErrorToast(
            result.error ?? "Unable to load student certificate data."
          );
          return;
        }

        setBundle(result.bundle);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadBundle();

    return () => {
      cancelled = true;
    };
  }, [classId, selectedStudentProfileId]);

  if (sortedStudents.length === 0) {
    return null;
  }

  return (
    <ClassTabCollapsibleSection
      title="Fast certificate"
      description="Export a certificate using temporary weights, even when the class or grade inputs are incomplete."
      defaultOpen={false}
    >
      <div className="flex flex-col gap-6 p-5">
        <div className="max-w-md">
          <FieldLabel
            htmlFor="fast-certificate-student"
            label="Student"
            hint="Choose who this fast certificate is for"
          />
          <Select
            value={selectedStudentProfileId || null}
            onValueChange={(value) => {
              setSelectedStudentProfileId(value ?? "");
            }}
          >
            <SelectTrigger id="fast-certificate-student" className="w-full">
              <SelectValue placeholder="Select a student">
                {selectedStudent?.full_name ?? null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              {sortedStudents.map((row) => (
                <SelectItem
                  key={row.student_profile_id}
                  value={row.student_profile_id}
                >
                  {row.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedStudentProfileId ? (
          <p className="text-sm text-muted-foreground">
            Select a student to configure weights and export a certificate.
          </p>
        ) : isLoading ? (
          <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed">
            <InlineSpinner />
          </div>
        ) : bundle ? (
          <StudentFastCertificateContent
            classRow={classRow}
            student={bundle.student}
            gradeRow={bundle.gradeRow}
            detail={bundle.detail}
            classTasks={bundle.classTasks}
            finalExam={bundle.finalExam}
            finalExamGrade={bundle.finalExamGrade}
            wrapInCollapsible={false}
          />
        ) : null}
      </div>
    </ClassTabCollapsibleSection>
  );
}
