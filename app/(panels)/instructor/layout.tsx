import { headers } from "next/headers";
import { requireInstructor } from "@/lib/auth/require-instructor";
import { requireInstructorRoutePermission } from "@/lib/auth/require-instructor-route-permission";

export const dynamic = "force-dynamic";

/**
 * Instructor feature pages (`/instructor/*`) render inside the shared
 * panels shell (session role chrome) — not a separate portal.
 */
export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  await requireInstructor();
  await requireInstructorRoutePermission(pathname);
  return children;
}
