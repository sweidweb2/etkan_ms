import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

export default function InstructorPage() {
  redirect(ROUTES.INSTRUCTOR_WORKSHOPS);
}
