import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";
import * as profileRepository from "@/repositories/profile.repository";
import {
  getUserPermissions,
  hasPermission,
  requirePermission,
} from "@/services/authorization.service";
import { createSeedAdminClient } from "@/scripts/lib/create-seed-admin-client";
import { loadEnvLocal } from "@/scripts/lib/load-env-local";

async function resolveSmokeUserId(
  client: ReturnType<typeof createSeedAdminClient>
): Promise<{ userId: string; role: string }> {
  const fromEnv = process.env.SMOKE_USER_ID?.trim();
  if (fromEnv) {
    const { data, error } = await profileRepository.findRoleById(
      client,
      fromEnv
    );
    if (error || !data?.role) {
      throw new Error(
        `SMOKE_USER_ID=${fromEnv} not found or has no role in profiles.`
      );
    }
    return { userId: fromEnv, role: data.role };
  }

  const { data: profiles, error } = await profileRepository.listProfiles(
    client,
    { roles: [ROLES.MANAGER] }
  );

  if (error) {
    throw new Error(`Failed to list manager profiles: ${error.message}`);
  }

  const manager = profiles?.[0];
  if (!manager?.id) {
    throw new Error(
      "No manager profile found. Seed a manager (`npm run seed:manager`) or set SMOKE_USER_ID."
    );
  }

  return { userId: manager.id, role: manager.role };
}

async function smokeAuthorization(): Promise<void> {
  loadEnvLocal();
  const client = createSeedAdminClient();
  const { userId, role } = await resolveSmokeUserId(client);

  console.log(`Smoke authz user: ${userId} (role=${role})`);

  const permissions = await getUserPermissions(client, userId);

  if (role === ROLES.MANAGER) {
    if (permissions.size === 0) {
      throw new Error(
        "Manager has zero permissions. Run `npm run seed:rbac` first."
      );
    }

    const sampleKeys = [
      PERMISSIONS.SUBJECTS_VIEW,
      PERMISSIONS.SUBJECTS_DELETE,
      PERMISSIONS.DASHBOARD_VIEW,
    ] as const;

    for (const key of sampleKeys) {
      const allowed = await hasPermission(client, userId, key);
      if (!allowed) {
        throw new Error(`Manager unexpectedly denied: ${key}`);
      }
    }

    await requirePermission(client, userId, PERMISSIONS.SUBJECTS_VIEW);
    console.log(`  Permissions loaded: ${permissions.size}`);
    console.log("  Sample checks: subjects.view / subjects.delete / dashboard.view OK");

    if (!(await hasPermission(client, userId, PERMISSIONS.RBAC_MANAGE))) {
      console.log(
        "  Note: manager missing rbac.manage — run `npm run seed:rbac` after Phase 7 catalog."
      );
    } else {
      console.log("  rbac.manage: OK");
    }
  } else {
    console.log(
      `  Non-manager smoke: permission count=${permissions.size} (expected 0 if unseeded)`
    );
  }

  const deniedUnknown = await hasPermission(client, userId, "not.a.real.key");
  if (deniedUnknown) {
    throw new Error("Unknown permission key was incorrectly allowed.");
  }

  console.log("Authorization smoke passed.");
}

smokeAuthorization().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
