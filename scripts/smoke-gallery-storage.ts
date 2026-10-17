/**
 * Local smoke: gallery Storage upload → replace → delete (no orphan objects).
 *
 * Usage: npx tsx scripts/smoke-gallery-storage.ts
 */
import {
  buildGalleryImageStoragePath,
  splitGalleryImageStoragePath,
} from "@/lib/manager/gallery/storage-path";
import * as galleryImageRepository from "@/repositories/gallery-image.repository";
import {
  removeObjects,
  uploadObject,
} from "@/repositories/object-storage.repository";
import { createSeedAdminClient } from "@/scripts/lib/create-seed-admin-client";

/** 1×1 PNG. Built without Sharp so the smoke path matches production uploads. */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

function pngFile(name: string): File {
  const copy = new ArrayBuffer(TINY_PNG.byteLength);
  new Uint8Array(copy).set(TINY_PNG);
  return new File([copy], name, { type: "image/png" });
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

  console.log("1) Upload original PNG…");
  const fileA = pngFile(`${nameA}.png`);
  const pathA = buildGalleryImageStoragePath(fileA.name);
  const splitA = splitGalleryImageStoragePath(pathA);
  const uploadA = await uploadObject(
    client,
    splitA.bucket,
    splitA.objectPath,
    fileA,
    fileA.type
  );
  assert(!uploadA.error, uploadA.error?.message ?? "upload A failed");
  assert(
    await objectExists(client, splitA.objectPath),
    "object A missing after upload"
  );

  const created = await galleryImageRepository.createGalleryImage(client, {
    name: nameA,
    storage_path: pathA,
  });
  assert(created.data && !created.error, created.error?.message ?? "insert failed");
  const rowId = created.data.id;
  assert(created.data.storage_path === pathA, "row did not store storage_path");
  console.log("   row", rowId);
  console.log("   path", pathA);

  console.log("2) Replace image (upload B, update row, remove A)…");
  const fileB = pngFile(`${nameB}.png`);
  const pathB = buildGalleryImageStoragePath(fileB.name);
  const splitB = splitGalleryImageStoragePath(pathB);
  const uploadB = await uploadObject(
    client,
    splitB.bucket,
    splitB.objectPath,
    fileB,
    fileB.type
  );
  assert(!uploadB.error, uploadB.error?.message ?? "upload B failed");

  const updated = await galleryImageRepository.updateGalleryImage(client, rowId, {
    name: nameB,
    storage_path: pathB,
  });
  assert(updated.data && !updated.error, updated.error?.message ?? "update failed");
  assert(updated.data.storage_path === pathB, "row still has the old path");

  const removeA = await removeObjects(client, splitA.bucket, [splitA.objectPath]);
  assert(!removeA.error, removeA.error?.message ?? "remove A failed");
  assert(
    !(await objectExists(client, splitA.objectPath)),
    "object A still present after replace (orphan)"
  );
  assert(
    await objectExists(client, splitB.objectPath),
    "object B missing after replace"
  );
  console.log("   replace ok; old object removed");

  console.log("3) Delete storage object B, then the row…");
  const removeB = await removeObjects(client, splitB.bucket, [splitB.objectPath]);
  assert(!removeB.error, removeB.error?.message ?? "remove B failed");
  assert(
    !(await objectExists(client, splitB.objectPath)),
    "object B still present after delete (orphan)"
  );

  const deleted = await galleryImageRepository.deleteGalleryImageById(
    client,
    rowId
  );
  assert(!deleted.error, deleted.error?.message ?? "delete row failed");

  console.log("Smoke gallery storage: OK");
}

main().catch((error) => {
  console.error("Smoke gallery storage: FAILED");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
