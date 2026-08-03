import { requireRole } from "@/lib/auth/require-role";
import { ROLES } from "@/lib/constants/roles";

export default async function CeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(ROLES.CEO);
  return children;
}
