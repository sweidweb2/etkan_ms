import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROLES } from "@/lib/constants/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import * as authRepository from "@/repositories/auth.repository";
import * as profileRepository from "@/repositories/profile.repository";
import { syncAuthUserRole } from "@/services/role.service";

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");

  try {
    const content = readFileSync(envPath, "utf8");

    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local is optional when vars are already exported
  }
}

async function seedAdminUser(): Promise<void> {
  loadEnvLocal();

  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
  const username = process.env.SEED_ADMIN_USERNAME ?? "admin";

  const adminClient = createSupabaseAdminClient();

  const existingUsername = await profileRepository.findProfileByUsername(
    adminClient,
    username
  );
  if (existingUsername.data) {
    console.log(`Seed admin profile already exists (${username}). Skipping.`);
    return;
  }

  const { data: authData, error: authError } =
    await authRepository.createAuthUser(adminClient, {
      email,
      password,
      username,
      fullName: "Admin",
      role: ROLES.ADMIN,
    });

  if (authError) {
    const message = authError.message.toLowerCase();
    if (message.includes("already") || message.includes("exists")) {
      console.log(`Seed admin auth user already exists (${email}). Skipping.`);
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
          role: ROLES.ADMIN,
        }
      );

      if (profileError) {
        throw new Error(profileError.message);
      }
    }

    await syncAuthUserRole(adminClient, authUserId, ROLES.ADMIN);

    console.log("Seed admin user created.");
    console.log(`  Email:    ${email}`);
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}`);
    console.log("Sign in at /auth/login.");
  } catch (error) {
    await authRepository.deleteAuthUser(adminClient, authUserId);
    throw error;
  }
}

seedAdminUser().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Seed failed.";
  console.error(message);
  process.exit(1);
});
