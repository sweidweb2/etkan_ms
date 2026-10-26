"use client";

import { ClassStudentsRoster } from "@/components/classes/class-students-roster";
import type { ClassStudentRow } from "@/types/class-student";

type TeacherClassStudentsSectionProps = {
  className: string;
  students: ClassStudentRow[];
};

/** Read-only enrolled students roster for the teacher class Main tab. */
export function TeacherClassStudentsSection({
  className,
  students,
}: TeacherClassStudentsSectionProps) {
  return (
    <ClassStudentsRoster
      className={className}
      students={students}
      showPhone={false}
      showEmail={false}
    />
  );
}
