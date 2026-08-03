import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

export default function CoManagerPage() {
  redirect(ROUTES.CO_MANAGER_DASHBOARD);
}
