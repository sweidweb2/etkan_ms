import { readFile } from "node:fs/promises";
import path from "node:path";
import * as galleryImageRepository from "@/repositories/gallery-image.repository";
import { createSeedAdminClient } from "@/scripts/lib/create-seed-admin-client";

type DriveImageJson = {
  name: string;
  url: string;
};

async function main() {
  const jsonPath = path.join(
    process.cwd(),
    "public",
    "drive images",
    "google_drive_images.json"
  );

  const raw = await readFile(jsonPath, "utf8");
  const parsed = JSON.parse(raw) as DriveImageJson[];

  if (!Array.isArray(parsed)) {
    throw new Error("google_drive_images.json must be an array.");
  }

  const rows = parsed
    .map((item) => ({
      name: String(item.name ?? "").trim(),
      direct_url: String(item.url ?? "").trim(),
    }))
    .filter((item) => item.name && item.direct_url);

  if (rows.length === 0) {
    throw new Error("No valid gallery images found in JSON.");
  }

  const client = createSeedAdminClient();

  const existing = await galleryImageRepository.listExistingDirectUrls(client);
  if (existing.error) {
    throw new Error(existing.error.message);
  }

  const existingUrls = new Set(
    (existing.data ?? []).map((row) => row.direct_url)
  );
  const toInsert = rows.filter((row) => !existingUrls.has(row.direct_url));

  if (toInsert.length === 0) {
    console.log(
      `Gallery seed: all ${rows.length} images already present. Nothing to insert.`
    );
    return;
  }

  const { error } = await galleryImageRepository.bulkInsertGalleryImages(
    client,
    toInsert
  );

  if (error) {
    throw new Error(error.message);
  }

  console.log(
    `Gallery seed: inserted ${toInsert.length} image(s) (${existingUrls.size} already existed, ${rows.length} in JSON).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
