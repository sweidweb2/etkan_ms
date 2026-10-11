/**
 * Local smoke: gallery Storage upload → replace → delete (no orphan objects).
 *
 * Usage: npx tsx scripts/smoke-gallery-storage.ts
 */
import sharp from "sharp";
import { optimizeGalleryImage } from "@/lib/manager/gallery/optimize-image";
import {
  buildGalleryImageStoragePath,
  getGalleryImageObjectPathFromPublicUrl,
} from "@/lib/manager/gallery/storage-path";
import * as galleryImageRepository from "@/repositories/gallery-image.repository";
import * as galleryStorageRepository from "@/repositories/gallery-storage.repository";
import { createSeedAdminClient } from "@/scripts/lib/create-seed-admin-client";

async function makePngFile(name: string, color: {
  r: number;
  g: number;
  b: number;
}): Promise<File> {
  const buffer = await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 3,
      background: color,
    },
  })
    .png()
    .toBuffer();

  return new File([buffer], name, { type: "image/png" });
}

async function objectExists(
  client: ReturnType<typeof createSeedAdminClient>,
  objectPath: string
): Promise<boolean> {
  const folder = objectPath.includes("/")
    ? objectPath.slice(0, objectPath.lastIndexOf("/"))
    : "";
  const fileName = objectPath.includes("/")
    ? objectPath.slice(objectPath.lastIndexOf("/") + 1)
    : objectPath;

  const { data, error } = await client.storage
    .from("gallery")
    .list(folder || undefined, { search: fileName, limit: 20 });

  if (error) {
    throw new Error(`list failed: ${error.message}`);
  }

  return (data ?? []).some((entry) => entry.name === fileName);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const client = createSeedAdminClient();
  const stamp = Date.now();
  const nameA = `smoke-gallery-a-${stamp}`;
  const nameB = `smoke-gallery-b-${stamp}`;

  console.log("1) Optimize + upload first image…");
  const fileA = await makePngFile(`${nameA}.png`, { r: 20, g: 80, b: 160 });
  const optimizedA = await optimizeGalleryImage({
    bytes: await fileA.arrayBuffer(),
    mimeType: fileA.type,
    originalFileName: fileA.name,
    byteLength: fileA.size,
  });
  assert(optimizedA.success, "optimize A failed");

  const pathA = buildGalleryImageStoragePath(optimizedA.fileName);
  const uploadA = await galleryStorageRepository.uploadGalleryImage(
    client,
    pathA,
    new Uint8Array(optimizedA.buffer),
    optimizedA.contentType
  );
  assert(!uploadA.error, uploadA.error?.message ?? "upload A failed");

  const urlA = galleryStorageRepository.getGalleryImagePublicUrl(client, pathA);
  const objectA = getGalleryImageObjectPathFromPublicUrl(urlA);
  assert(objectA, "could not parse object path from url A");
  assert(await objectExists(client, objectA), "object A missing after upload");

  const downloadedA = await fetch(urlA);
  assert(downloadedA.ok, `download A failed: ${downloadedA.status}`);
  const bytesA = Buffer.from(await downloadedA.arrayBuffer());
  const metaA = await sharp(bytesA).metadata();
  assert(metaA.format === "webp" && metaA.width, "downloaded A is not valid webp");

  const created = await galleryImageRepository.createGalleryImage(client, {
    name: nameA,
    direct_url: urlA,
  });
  assert(created.data && !created.error, created.error?.message ?? "insert failed");
  const rowId = created.data.id;
  console.log("   row", rowId);
  console.log("   url", urlA);

  console.log("2) Replace image (upload B, update row, remove A)…");
  const fileB = await makePngFile(`${nameB}.png`, { r: 200, g: 40, b: 40 });
  const optimizedB = await optimizeGalleryImage({
    bytes: await fileB.arrayBuffer(),
    mimeType: fileB.type,
    originalFileName: fileB.name,
    byteLength: fileB.size,
  });
  assert(optimizedB.success, "optimize B failed");

  const pathB = buildGalleryImageStoragePath(optimizedB.fileName);
  const uploadB = await galleryStorageRepository.uploadGalleryImage(
    client,
    pathB,
    new Uint8Array(optimizedB.buffer),
    optimizedB.contentType
  );
  assert(!uploadB.error, uploadB.error?.message ?? "upload B failed");

  const urlB = galleryStorageRepository.getGalleryImagePublicUrl(client, pathB);
  const objectB = getGalleryImageObjectPathFromPublicUrl(urlB);
  assert(objectB, "could not parse object path from url B");

  const updated = await galleryImageRepository.updateGalleryImage(client, rowId, {
    name: nameB,
    direct_url: urlB,
  });
  assert(updated.data && !updated.error, updated.error?.message ?? "update failed");

  const removeA = await galleryStorageRepository.removeGalleryImages(client, [
    objectA,
  ]);
  assert(!removeA.error, removeA.error?.message ?? "remove A failed");
  assert(
    !(await objectExists(client, objectA)),
    "object A still present after replace (orphan)"
  );
  assert(await objectExists(client, objectB), "object B missing after replace");
  console.log("   replace ok; old object removed");

  console.log("3) Delete row + storage object B…");
  const deleted = await galleryImageRepository.deleteGalleryImageById(
    client,
    rowId
  );
  assert(!deleted.error, deleted.error?.message ?? "delete row failed");

  const removeB = await galleryStorageRepository.removeGalleryImages(client, [
    objectB,
  ]);
  assert(!removeB.error, removeB.error?.message ?? "remove B failed");
  assert(
    !(await objectExists(client, objectB)),
    "object B still present after delete (orphan)"
  );

  console.log("Smoke gallery storage: OK");
}

main().catch((error) => {
  console.error("Smoke gallery storage: FAILED");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
