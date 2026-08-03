import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

export default function InstructorSessionsPage() {
  redirect(ROUTES.INSTRUCTOR_WORKSHOPS);
}
