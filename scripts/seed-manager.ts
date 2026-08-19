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
  const username = process.env.SEED_MANAGER_USERNAME ?? "asweid";

  const adminClient = createSeedAdminClient();

  const existingUsername = await profileRepository.findProfileByUsername(
    adminClient,
    username
  );
  if (existingUsername.data) {
    console.log(`Seed manager profile already exists (${username}). Skipping.`);
    return;
  }

  const { data: authData, error: authError } =
    await authRepository.createAuthUser(adminClient, {
      email,
      password,
      username,
      fullName: "Manager",
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
          username,
          role: ROLES.MANAGER,
        }
      );

      if (profileError) {
        throw new Error(profileError.message);
      }
    }

    await syncAuthUserRole(adminClient, authUserId, ROLES.MANAGER);

    console.log("Seed manager user created.");
    console.log(`  Email:    ${email}`);
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}`);
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
