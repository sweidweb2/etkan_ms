import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

export default function ManagerPage() {
  redirect(ROUTES.MANAGER_DASHBOARD);
}
