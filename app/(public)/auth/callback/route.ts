import { NextResponse } from "next/server";
import { getPostLoginRedirect } from "@/lib/auth/redirect";
import { ROUTES } from "@/lib/constants/routes";
import { appendQueryParam } from "@/lib/url/append-query-param";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { rejectIfMaintenanceBlocksRole } from "@/services/auth/auth.service";
import { resolveUserRole } from "@/services/auth/role.service";
import * as authRepository from "@/repositories/auth.repository";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createSupabaseServerActionClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const role = await resolveUserRole(supabase, data.user);
      const maintenanceError = await rejectIfMaintenanceBlocksRole(
        supabase,
        role
      );
      if (maintenanceError) {
        await authRepository.signOut(supabase);
        return NextResponse.redirect(
          `${origin}${appendQueryParam(ROUTES.LOGIN, "error", "maintenance")}`
        );
      }
      const redirectPath = getPostLoginRedirect(role, next);
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  return NextResponse.redirect(
    `${origin}${ROUTES.LOGIN}?error=auth_callback_failed`
  );
}
