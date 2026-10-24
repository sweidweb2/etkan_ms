import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildNoIndexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildNoIndexMetadata("Maintenance");

export default function MaintenanceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
