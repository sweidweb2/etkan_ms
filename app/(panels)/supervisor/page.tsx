import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

export default function SupervisorPage() {
  redirect(ROUTES.MANAGER_STUDENTS);
}
