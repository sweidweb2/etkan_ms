import { requireRole } from "@/lib/auth/require-role";
import { ROLES } from "@/lib/constants/roles";

export default async function CoManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(ROLES.CO_MANAGER);
  return children;
}
