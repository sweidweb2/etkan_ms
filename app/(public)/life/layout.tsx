import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

type LifeLayoutProps = {
  children: ReactNode;
};

export default async function LifeLayout({ children }: LifeLayoutProps) {
  await requireAdmin();
  return children;
}
