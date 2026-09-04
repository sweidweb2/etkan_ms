import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

export default function CrmPage() {
  redirect(ROUTES.MANAGER_GUESTS);
}
