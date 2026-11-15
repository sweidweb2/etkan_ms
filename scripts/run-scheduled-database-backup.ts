/**
 * Run the weekly SQL database backup once (public tables + auth users)
 * and upload to the private `database-backups` Storage bucket.
 *
 * Usage: npm run backup:database
 */
import { DATABASE_BACKUPS_STORAGE_BUCKET } from "@/lib/constants/database-backups-storage";
import { createSeedAdminClient } from "@/scripts/lib/create-seed-admin-client";
import {
  listRecentDatabaseBackupObjects,
  runScheduledDatabaseSqlBackup,
} from "@/services/backup/scheduled-database-backup.service";

async function main() {
  const client = createSeedAdminClient();

  console.log("Running scheduled SQL database backup (no media)…");
  const result = await runScheduledDatabaseSqlBackup(client);

  console.log("Upload OK");
  console.log(`  bucket:      ${result.bucket}`);
  console.log(`  objectPath:  ${result.objectPath}`);
  console.log(`  bytes:       ${result.byteLength}`);
  console.log(
    `  public:      ${result.publicTableCount} tables / ${result.publicRowCount} rows`
  );
  console.log(`  auth rows:   ${result.authRowCount}`);

  const folder = result.objectPath.includes("/")
    ? result.objectPath.slice(0, result.objectPath.lastIndexOf("/"))
    : "";
  const listed = await listRecentDatabaseBackupObjects(client, folder);
  const fileName = result.objectPath.slice(
    result.objectPath.lastIndexOf("/") + 1
  );
  const found = listed.some((entry) => entry.name === fileName);

  console.log(`Storage list (${DATABASE_BACKUPS_STORAGE_BUCKET}/${folder}):`);
  for (const entry of listed.slice(0, 10)) {
    console.log(`  - ${entry.name}${entry.name === fileName ? "  ← new" : ""}`);
  }

  if (!found) {
    throw new Error(
      `Backup uploaded but not found when listing ${folder}/${fileName}`
    );
  }

  console.log("Verified: object is visible in Storage.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Backup failed.";
  console.error(message);
  process.exit(1);
});
