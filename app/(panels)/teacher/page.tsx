import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

/** Profile content lives under Settings; keep /teacher as a stable entry. */
export default function TeacherPage() {
  redirect(ROUTES.TEACHER_CLASSES);
}
