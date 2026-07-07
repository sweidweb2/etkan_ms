import {
  getDefaultStudentClassTabDetail,
  MANAGER_STUDENT_CLASS_DETAIL_MOCK,
} from "@/lib/constants/manager-student-class-detail-mock";
import type { ManagerStudentClassTabDetail } from "@/types/manager-student-class-detail";

export function getManagerStudentClassDetailPreview(
  userId: string,
  classId: string
): ManagerStudentClassTabDetail {
  return (
    MANAGER_STUDENT_CLASS_DETAIL_MOCK[`${userId}:${classId}`] ??
    getDefaultStudentClassTabDetail()
  );
}
