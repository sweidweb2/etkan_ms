import { headers } from "next/headers";
import { RolePanelLayout } from "@/components/panels/role-panel-layout";
import { requireInstructor } from "@/lib/auth/require-instructor";
import { requireInstructorRoutePermission } from "@/lib/auth/require-instructor-route-permission";

export const dynamic = "force-dynamic";

/**
 * Instructor feature pages (`/instructor/*`) render inside the user's
 * normal role panel (CEO, student, …) — not a separate portal shell.
 */
export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const { role } = await requireInstructor();
  await requireInstructorRoutePermission(pathname);

  return <RolePanelLayout role={role}>{children}</RolePanelLayout>;
}
