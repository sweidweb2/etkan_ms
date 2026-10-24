import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

export default function TeacherSettingsLayoutRedirectPage() {
  redirect(ROUTES.TEACHER_SETTINGS);
}
