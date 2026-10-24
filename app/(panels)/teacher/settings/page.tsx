import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

export default function TeacherSettingsIndexPage() {
  redirect(ROUTES.TEACHER_SETTINGS_MY_INFO);
}
