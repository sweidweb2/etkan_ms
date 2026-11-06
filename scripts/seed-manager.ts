import { ROLES } from "@/lib/constants/roles";
import * as authRepository from "@/repositories/auth.repository";
import * as profileRepository from "@/repositories/profile.repository";
import { createSeedAdminClient } from "@/scripts/lib/create-seed-admin-client";
import { loadEnvLocal } from "@/scripts/lib/load-env-local";
import { syncAuthUserRole } from "@/services/auth/role.service";

async function seedManagerUser(): Promise<void> {
  loadEnvLocal();

  const email = process.env.SEED_MANAGER_EMAIL ?? "asweid657@gmail.com";
  const password = process.env.SEED_MANAGER_PASSWORD ?? "ali@1234";
  const fullName = process.env.SEED_MANAGER_FULL_NAME ?? "Manager";

  const adminClient = createSeedAdminClient();

  const existingAuthUser = await authRepository.findAuthUserByEmail(
    adminClient,
    email
  );
  if (existingAuthUser.data?.user) {
    console.log(`Seed manager auth user already exists (${email}). Skipping.`);
    return;
  }

  const { data: authData, error: authError } =
    await authRepository.createAuthUser(adminClient, {
      email,
      password,
      fullName,
      role: ROLES.MANAGER,
    });

  if (authError) {
    const message = authError.message.toLowerCase();
    if (message.includes("already") || message.includes("exists")) {
      console.log(`Seed manager auth user already exists (${email}). Skipping.`);
      return;
    }
    throw new Error(authError.message);
  }

  if (!authData.user) {
    throw new Error("Failed to create auth user.");
  }

  const authUserId = authData.user.id;

  try {
    const existingProfile = await profileRepository.findProfileById(
      adminClient,
      authUserId
    );

    if (!existingProfile.data) {
      const { error: profileError } = await profileRepository.createProfile(
        adminClient,
        {
          id: authUserId,
          full_name: fullName,
          role: ROLES.MANAGER,
        }
      );

      if (profileError) {
        throw new Error(profileError.message);
      }
    }

    await syncAuthUserRole(adminClient, authUserId, ROLES.MANAGER);

    console.log("Seed manager user created.");
    console.log(`  Email:     ${email}`);
    console.log(`  Full name: ${fullName}`);
    console.log(`  Password:  ${password}`);
    console.log("Sign in at /auth/login.");
  } catch (error) {
    await authRepository.deleteAuthUser(adminClient, authUserId);
    throw error;
  }
}

seedManagerUser().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Seed failed.";
  console.error(message);
  process.exit(1);
});
