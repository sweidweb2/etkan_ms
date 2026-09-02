import { requireRole } from "@/lib/auth/require-role";
import { ROLES } from "@/lib/constants/roles";

export default async function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(ROLES.SUPERVISOR);
  return children;
}
