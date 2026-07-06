import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

export default function StudentPage() {
  redirect(ROUTES.STUDENT_DASHBOARD);
}
