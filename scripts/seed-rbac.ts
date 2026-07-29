import {
  PERMISSION_DEFINITIONS,
  PERMISSION_KEYS,
} from "@/lib/constants/permissions";
import { ROLES } from "@/lib/constants/roles";
import * as permissionRepository from "@/repositories/permission.repository";
import { createSeedAdminClient } from "@/scripts/lib/create-seed-admin-client";
import { loadEnvLocal } from "@/scripts/lib/load-env-local";

async function seedRbac(): Promise<void> {
  loadEnvLocal();

  const adminClient = createSeedAdminClient();

  const catalogRows = PERMISSION_DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: definition.label,
    feature_group: definition.feature,
    access: definition.access,
  }));

  const { error: upsertError } = await permissionRepository.upsertPermissions(
    adminClient,
    catalogRows
  );

  if (upsertError) {
    throw new Error(`Failed to upsert permissions: ${upsertError.message}`);
  }

  const { error: replaceError } =
    await permissionRepository.replaceRolePermissions(
      adminClient,
      ROLES.MANAGER,
      [...PERMISSION_KEYS]
    );

  if (replaceError) {
    throw new Error(
      `Failed to seed manager role permissions: ${replaceError.message}`
    );
  }

  const { data: catalog, error: catalogError } =
    await permissionRepository.listPermissions(adminClient);

  if (catalogError) {
    throw new Error(`Failed to list permissions: ${catalogError.message}`);
  }

  const catalogKeys = new Set((catalog ?? []).map((row) => row.key));
  if (catalogKeys.size !== PERMISSION_KEYS.length) {
    throw new Error(
      `Catalog size mismatch: DB has ${catalogKeys.size}, code has ${PERMISSION_KEYS.length}.`
    );
  }

  for (const key of PERMISSION_KEYS) {
    if (!catalogKeys.has(key)) {
      throw new Error(`Missing permission in DB catalog: ${key}`);
    }
  }

  const { data: managerGrants, error: grantsError } =
    await permissionRepository.listPermissionKeysByRole(
      adminClient,
      ROLES.MANAGER
    );

  if (grantsError) {
    throw new Error(
      `Failed to list manager permissions: ${grantsError.message}`
    );
  }

  const managerKeys = (managerGrants ?? []).map((row) => row.permission_key);
  const managerKeySet = new Set(managerKeys);

  if (managerKeys.length !== PERMISSION_KEYS.length) {
    throw new Error(
      `Manager grant count mismatch: DB has ${managerKeys.length}, expected ${PERMISSION_KEYS.length}.`
    );
  }

  for (const key of managerKeys) {
    if (!catalogKeys.has(key)) {
      throw new Error(`Orphan manager permission_key (not in catalog): ${key}`);
    }
  }

  for (const key of PERMISSION_KEYS) {
    if (!managerKeySet.has(key)) {
      throw new Error(`Manager missing permission grant: ${key}`);
    }
  }

  console.log("RBAC seed complete.");
  console.log(`  Permissions catalog: ${catalogKeys.size}`);
  console.log(`  Manager grants:      ${managerKeys.length}`);
  console.log("  Other roles:         empty (no role_permissions rows)");
}

seedRbac().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
