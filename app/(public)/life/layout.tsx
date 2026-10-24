import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/require-role";

/**
 * Admin-gated under the static public shell. Must stay request-time so
 * `requireAdmin()` (cookies/session) is never baked into ISR HTML.
 */
export const dynamic = "force-dynamic";

type LifeLayoutProps = {
  children: ReactNode;
};

export default async function LifeLayout({ children }: LifeLayoutProps) {
  await requireAdmin();
  return children;
}
