import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

export default function AdminPage() {
  redirect(ROUTES.ADMIN_DASHBOARD);
}
