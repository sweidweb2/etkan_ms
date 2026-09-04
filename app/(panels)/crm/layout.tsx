import { requireRole } from "@/lib/auth/require-role";
import { ROLES } from "@/lib/constants/roles";

export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(ROLES.CRM);
  return children;
}
