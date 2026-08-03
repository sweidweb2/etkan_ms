import { requireRole } from "@/lib/auth/require-role";
import { ROLES } from "@/lib/constants/roles";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(ROLES.STUDENT);
  return children;
}
