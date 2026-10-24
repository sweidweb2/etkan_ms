import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

export default function TeacherSettingsMyInfoRedirectPage() {
  redirect(ROUTES.TEACHER_SETTINGS);
}
