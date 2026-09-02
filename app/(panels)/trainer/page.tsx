import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

export default function TrainerPage() {
  redirect(ROUTES.MANAGER_WORKSHOPS);
}
