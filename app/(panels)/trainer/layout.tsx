import { requireRole } from "@/lib/auth/require-role";
import { ROLES } from "@/lib/constants/roles";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(ROLES.TRAINER);
  return children;
}
