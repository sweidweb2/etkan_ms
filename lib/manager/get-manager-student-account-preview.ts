import { getManagerStudentAccountMock } from "@/lib/constants/manager-student-account-mock";

export function getManagerStudentAccountPreview(studentProfileId: string) {
  return getManagerStudentAccountMock(studentProfileId);
}
