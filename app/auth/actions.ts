"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants/routes";
import { logout } from "@/services/auth.service";

export async function logoutAction(): Promise<void> {
  const client = await createSupabaseServerActionClient();
  await logout(client);
  revalidatePath("/", "layout");
  redirect(`${ROUTES.LOGIN}?toast=signed_out`);
}
