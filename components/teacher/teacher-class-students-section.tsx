"use client";

import { setTeacherStudentTeamLeaderAction } from "@/app/teacher/classes/actions";
import { usePermissions } from "@/components/auth/permissions-provider";
import { ClassStudentsRoster } from "@/components/classes/class-students-roster";
import { hasPermissionInSet } from "@/lib/auth/permission-checks";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type { ClassStudentRow } from "@/types/class-student";

type TeacherClassStudentsSectionProps = {
  classId: string;
  className: string;
  students: ClassStudentRow[];
};

/** Enrolled students roster for the teacher class Main tab (team leader toggle only). */
export function TeacherClassStudentsSection({
  classId,
  className,
  students,
}: TeacherClassStudentsSectionProps) {
  const permissions = usePermissions();
  const canSetTeamLeader = hasPermissionInSet(
    permissions,
    PERMISSIONS.CLASSES_SET_TEAM_LEADER
  );

  return (
    <ClassStudentsRoster
      className={className}
      students={students}
      showPhone={false}
      showEmail={false}
      teamLeader={
        canSetTeamLeader
          ? { classId, action: setTeacherStudentTeamLeaderAction }
          : undefined
      }
    />
  );
}
