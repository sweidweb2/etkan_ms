import { ManageBlogsPanel } from "@/components/manager/blogs/manage-blogs-panel";
import { getSessionUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listBlogsForManager } from "@/services/public/blog.service";

export default async function ManagerBlogsPage() {
  const adminClient = createSupabaseAdminClient();
  const user = await getSessionUser();
  const blogs = await listBlogsForManager(adminClient, user?.id ?? null);

  return <ManageBlogsPanel initialBlogs={blogs} />;
}
