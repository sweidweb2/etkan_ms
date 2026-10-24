import { notFound } from "next/navigation";
import { TeacherSettingsPanel } from "@/components/teacher/settings/teacher-settings-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTeacherSelfProfile } from "@/services/auth/teacher-account-self.service";

export default async function TeacherSettingsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const profile = await getTeacherSelfProfile(adminClient, user?.id ?? null);

  if (!profile) {
    notFound();
  }

  return <TeacherSettingsPanel profile={profile} />;
}
