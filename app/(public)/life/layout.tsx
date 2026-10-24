import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/require-role";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";

/**
 * Admin-gated under the static public shell. Must stay request-time so
 * `requireAdmin()` (cookies/session) is never baked into ISR HTML.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildNoIndexMetadata("Life");

type LifeLayoutProps = {
  children: ReactNode;
};

export default async function LifeLayout({ children }: LifeLayoutProps) {
  await requireAdmin();
  return children;
}
