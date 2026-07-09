import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth/session";
import { getDashboardRouteForRole } from "@/lib/constants/routes";

export async function GET() {
  const role = await getSessionRole();

  return NextResponse.json({
    dashboardHref: role ? getDashboardRouteForRole(role) : null,
  });
}
