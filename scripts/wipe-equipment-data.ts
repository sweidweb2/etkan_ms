/**
 * Wipe equipment inventory + borrow records only.
 * Usage: npx tsx scripts/wipe-equipment-data.ts
 */
import { createSeedAdminClient } from "@/scripts/lib/create-seed-admin-client";

async function main() {
  const client = createSeedAdminClient();

  const { error: borrowError, count: borrowCount } = await client
    .from("borrow_equipment")
    .delete({ count: "exact" })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (borrowError) {
    throw new Error(`borrow_equipment: ${borrowError.message}`);
  }

  const { error: equipmentError, count: equipmentCount } = await client
    .from("equipments")
    .delete({ count: "exact" })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (equipmentError) {
    throw new Error(`equipments: ${equipmentError.message}`);
  }

  console.log(
    `Wiped equipment data: ${borrowCount ?? 0} borrow row(s), ${equipmentCount ?? 0} equipment row(s).`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
