import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getClaimsWithSharedJwks } from "@/lib/auth/get-claims";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function measureParallelProfileAndPermissions(userId: string) {
  const client = await createSupabaseServerComponentClient();
  const adminClient = createSupabaseAdminClient();
  const start = performance.now();
  const [profileResult, permissionsResult] = await Promise.all([
    client
      .from("profiles")
      .select("id, username, role, is_instructor, created_at")
      .eq("id", userId)
      .maybeSingle(),
    adminClient
      .from("role_permissions")
      .select("permission_key")
      .eq("role", "manager")
      .order("permission_key", { ascending: true }),
  ]);
  const totalMs = performance.now() - start;

  return { profileResult, permissionsResult, totalMs };
}

export default async function TestDB() {
  const client = await createSupabaseServerComponentClient();

  const { data: claimsData } = await getClaimsWithSharedJwks(client);
  const userId =
    typeof claimsData?.claims?.sub === "string"
      ? claimsData.claims.sub
      : null;

  if (!userId) {
    return <pre>Not logged in. Open /test-db while signed in.</pre>;
  }

  const { profileResult, permissionsResult, totalMs } =
    await measureParallelProfileAndPermissions(userId);

  console.log("PARALLEL TOTAL:", totalMs, "ms");
  console.log("PROFILE ERROR:", profileResult.error);
  console.log("PROFILE:", profileResult.data);
  console.log("PERMISSIONS ERROR:", permissionsResult.error);
  console.log("PERMISSIONS:", permissionsResult.data?.length);

  return (
    <pre>
      {`PARALLEL TOTAL: ${totalMs.toFixed(2)} ms`}
    </pre>
  );
}
