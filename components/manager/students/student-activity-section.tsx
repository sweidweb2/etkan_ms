"use client";

import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { StudentActivityTable } from "@/components/shared/student-activity-table";
import { COLLAPSIBLE_SECTION_STORAGE_KEYS } from "@/lib/constants/collapsible-section-storage";
import type { ManagerStudentActivityRow } from "@/types/manager-student-activity";

type StudentActivitySectionProps = {
  rows: ManagerStudentActivityRow[];
};

export function StudentActivitySection({ rows }: StudentActivitySectionProps) {
  return (
    <ClassTabCollapsibleSection
      title="Activity"
      description="Audited events for this student. Only actions written to the audit log appear here."
      storageKey={COLLAPSIBLE_SECTION_STORAGE_KEYS.STUDENT_DETAILS_ACTIVITY}
      defaultOpen={false}
    >
      <div className="p-3 sm:p-4">
        <StudentActivityTable rows={rows} />
      </div>
    </ClassTabCollapsibleSection>
  );
}
