import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

export default function TeacherPage() {
  redirect(ROUTES.TEACHER_SCHEDULE);
}
