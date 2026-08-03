import {
  PERMISSION_DEFINITIONS,
  PERMISSION_KEYS,
} from "@/lib/constants/permissions";
import { ROLE_SEED_PERMISSIONS } from "@/lib/constants/role-seed-permissions";
import { ROLE_VALUES, ROLES } from "@/lib/constants/roles";
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

  console.log("RBAC seed complete.");
  console.log(`  Permissions catalog: ${catalogKeys.size}`);

  for (const role of ROLE_VALUES) {
    const expectedKeys = [...ROLE_SEED_PERMISSIONS[role]];

    const { error: replaceError } =
      await permissionRepository.replaceRolePermissions(
        adminClient,
        role,
        expectedKeys
      );

    if (replaceError) {
      throw new Error(
        `Failed to seed ${role} role permissions: ${replaceError.message}`
      );
    }

    const { data: grants, error: grantsError } =
      await permissionRepository.listPermissionKeysByRole(adminClient, role);

    if (grantsError) {
      throw new Error(
        `Failed to list ${role} permissions: ${grantsError.message}`
      );
    }

    const grantedKeys = (grants ?? []).map((row) => row.permission_key);
    const grantedSet = new Set(grantedKeys);

    if (grantedKeys.length !== expectedKeys.length) {
      throw new Error(
        `${role} grant count mismatch: DB has ${grantedKeys.length}, expected ${expectedKeys.length}.`
      );
    }

    for (const key of grantedKeys) {
      if (!catalogKeys.has(key)) {
        throw new Error(
          `Orphan ${role} permission_key (not in catalog): ${key}`
        );
      }
    }

    for (const key of expectedKeys) {
      if (!grantedSet.has(key)) {
        throw new Error(`${role} missing permission grant: ${key}`);
      }
    }

    const label =
      role === ROLES.MANAGER
        ? "Manager"
        : role === ROLES.ADMIN
          ? "Admin"
          : role === ROLES.CEO
            ? "CEO"
            : role === ROLES.CO_MANAGER
              ? "Co-manager"
              : role === ROLES.TEACHER
                ? "Teacher"
                : role === ROLES.TRAINER
                  ? "Trainer"
                  : "Student";

    console.log(`  ${label} grants: ${expectedKeys.length}`);
  }
}

seedRbac().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
