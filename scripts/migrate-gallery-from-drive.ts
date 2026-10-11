/**
 * Drive → gallery bucket migration (local first), plus dump restore for deploy.
 *
 * From Google Drive (reads public/drive images/google_drive_images.json):
 *   npm run migrate:gallery-drive
 *
 * From local dump after a successful Drive run (no Drive needed):
 *   npm run migrate:gallery-from-dump
 *
 * Writes:
 *   - supabase/dumps/storage/gallery/<objectPath>  (optimized WebP files)
 *   - scripts/data/gallery-migrate-manifest.json    (status + object paths)
 *
 * Deploy: copy the dump folder to the server (or keep it), point .env at prod,
 * then run `npm run migrate:gallery-from-dump`.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { optimizeGalleryImage } from "@/lib/manager/gallery/optimize-image";
import {
  buildGalleryImageStoragePath,
  GALLERY_STORAGE_BUCKET,
  getGalleryImageObjectPathFromPublicUrl,
  splitGalleryImageStoragePath,
} from "@/lib/manager/gallery/storage-path";
import * as galleryImageRepository from "@/repositories/gallery-image.repository";
import * as galleryStorageRepository from "@/repositories/gallery-storage.repository";
import { createSeedAdminClient } from "@/scripts/lib/create-seed-admin-client";

type DriveImageJson = {
  name: string;
  url: string;
};

type ManifestStatus = "ok" | "failed" | "skipped";

type ManifestItem = {
  name: string;
  driveUrl: string;
  driveId: string | null;
  objectPath: string | null;
  dumpRelativePath: string | null;
  status: ManifestStatus;
  error: string | null;
  directUrl: string | null;
};

type Manifest = {
  version: 1;
  generatedAt: string;
  source: string;
  mode: "drive" | "dump";
  items: ManifestItem[];
};

const JSON_RELATIVE = path.join("public", "drive images", "google_drive_images.json");
const MANIFEST_RELATIVE = path.join(
  "scripts",
  "data",
  "gallery-migrate-manifest.json"
);
const DUMP_DIR_RELATIVE = path.join(
  "supabase",
  "dumps",
  "storage",
  GALLERY_STORAGE_BUCKET
);

const DOWNLOAD_TIMEOUT_MS = 45_000;
const BETWEEN_DOWNLOADS_MS = 150;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractDriveId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const fromQuery =
      parsed.searchParams.get("id")?.trim() ||
      parsed.searchParams.get("fileId")?.trim();
    if (fromQuery) {
      return fromQuery;
    }
    const pathMatch = parsed.pathname.match(
      /\/(?:file\/d|uc\/d|d)\/([^/=]+)/i
    );
    return pathMatch?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

function guessMimeType(
  contentTypeHeader: string | null,
  fileName: string
): string {
  const header = (contentTypeHeader ?? "").split(";")[0]?.trim().toLowerCase();
  if (
    header === "image/jpeg" ||
    header === "image/png" ||
    header === "image/webp" ||
    header === "image/gif"
  ) {
    return header;
  }

  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

async function downloadDriveBytes(
  driveId: string,
  fileName: string
): Promise<{ bytes: Buffer; mimeType: string }> {
  const urls = [
    `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w2000`,
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`,
  ];

  let lastError = "Download failed.";

  for (const url of urls) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "etkan-ms-gallery-migrate/1.0",
        },
      });

      if (!response.ok) {
        lastError = `HTTP ${response.status} for ${url}`;
        continue;
      }

      const contentType = response.headers.get("content-type");
      const bytes = Buffer.from(await response.arrayBuffer());

      if (bytes.byteLength < 32) {
        lastError = "Downloaded file too small.";
        continue;
      }

      // Drive often returns HTML when the file is blocked / needs confirm.
      const head = bytes.subarray(0, 32).toString("utf8").toLowerCase();
      if (
        head.includes("<!doctype") ||
        head.includes("<html") ||
        (contentType ?? "").includes("text/html")
      ) {
        lastError = "Drive returned HTML instead of an image.";
        continue;
      }

      return {
        bytes,
        mimeType: guessMimeType(contentType, fileName),
      };
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : "Download request failed.";
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(lastError);
}

async function loadSourceJson(): Promise<DriveImageJson[]> {
  const jsonPath = path.join(process.cwd(), JSON_RELATIVE);
  const raw = await readFile(jsonPath, "utf8");
  const parsed = JSON.parse(raw) as DriveImageJson[];
  if (!Array.isArray(parsed)) {
    throw new Error("google_drive_images.json must be an array.");
  }
  return parsed
    .map((item) => ({
      name: String(item.name ?? "").trim(),
      url: String(item.url ?? "").trim(),
    }))
    .filter((item) => item.name && item.url);
}

async function loadManifest(): Promise<Manifest> {
  const manifestPath = path.join(process.cwd(), MANIFEST_RELATIVE);
  const raw = await readFile(manifestPath, "utf8");
  const parsed = JSON.parse(raw) as Manifest;
  if (!parsed?.items || !Array.isArray(parsed.items)) {
    throw new Error("gallery-migrate-manifest.json is missing items[].");
  }
  return parsed;
}

async function writeManifest(manifest: Manifest) {
  const manifestPath = path.join(process.cwd(), MANIFEST_RELATIVE);
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function upsertDbRow(
  client: ReturnType<typeof createSeedAdminClient>,
  existingByDriveUrl: Map<string, { id: string; name: string; direct_url: string }>,
  existingByName: Map<string, { id: string; name: string; direct_url: string }>,
  name: string,
  driveUrl: string,
  directUrl: string
) {
  const byDrive = existingByDriveUrl.get(driveUrl);
  if (byDrive) {
    const updated = await galleryImageRepository.updateGalleryImage(
      client,
      byDrive.id,
      { name, direct_url: directUrl }
    );
    if (updated.error) {
      throw new Error(updated.error.message);
    }
    existingByDriveUrl.delete(driveUrl);
    existingByName.set(name, {
      id: byDrive.id,
      name,
      direct_url: directUrl,
    });
    return;
  }

  const byName = existingByName.get(name);
  if (byName && getGalleryImageObjectPathFromPublicUrl(byName.direct_url)) {
    // Already on Storage under this name — leave row; caller may still re-upload dump.
    return;
  }

  if (byName) {
    const updated = await galleryImageRepository.updateGalleryImage(
      client,
      byName.id,
      { name, direct_url: directUrl }
    );
    if (updated.error) {
      throw new Error(updated.error.message);
    }
    existingByName.set(name, {
      id: byName.id,
      name,
      direct_url: directUrl,
    });
    return;
  }

  const created = await galleryImageRepository.createGalleryImage(client, {
    name,
    direct_url: directUrl,
  });
  if (created.error || !created.data) {
    throw new Error(created.error?.message ?? "Insert failed.");
  }
  existingByName.set(name, {
    id: created.data.id,
    name,
    direct_url: directUrl,
  });
}

async function migrateFromDrive() {
  const rows = await loadSourceJson();
  const client = createSeedAdminClient();
  const dumpDir = path.join(process.cwd(), DUMP_DIR_RELATIVE);
  await mkdir(dumpDir, { recursive: true });

  const existing = await galleryImageRepository.listAllGalleryImages(client);
  if (existing.error) {
    throw new Error(existing.error.message);
  }

  const existingByDriveUrl = new Map<
    string,
    { id: string; name: string; direct_url: string }
  >();
  const existingByName = new Map<
    string,
    { id: string; name: string; direct_url: string }
  >();

  for (const row of existing.data ?? []) {
    existingByName.set(row.name, row);
    if (!getGalleryImageObjectPathFromPublicUrl(row.direct_url)) {
      existingByDriveUrl.set(row.direct_url, row);
    }
  }

  // Resume from previous manifest when object already dumped + Storage row OK.
  let previousByDriveUrl = new Map<string, ManifestItem>();
  try {
    const previous = await loadManifest();
    previousByDriveUrl = new Map(
      previous.items
        .filter((item) => item.status === "ok" && item.objectPath)
        .map((item) => [item.driveUrl, item])
    );
  } catch {
    // First run — no manifest yet.
  }

  const items: ManifestItem[] = [];
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`Migrating ${rows.length} Drive image(s) → ${GALLERY_STORAGE_BUCKET}…`);

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]!;
    const label = `[${index + 1}/${rows.length}] ${row.name}`;
    const driveId = extractDriveId(row.url);

    const prior = previousByDriveUrl.get(row.url);
    const existingRow = existingByName.get(row.name);
    if (
      prior?.objectPath &&
      existingRow &&
      getGalleryImageObjectPathFromPublicUrl(existingRow.direct_url)
    ) {
      items.push({
        ...prior,
        name: row.name,
        driveUrl: row.url,
        status: "skipped",
        error: null,
        directUrl: existingRow.direct_url,
      });
      skipped += 1;
      console.log(`${label}: skipped (already on Storage)`);
      continue;
    }

    if (!driveId) {
      items.push({
        name: row.name,
        driveUrl: row.url,
        driveId: null,
        objectPath: null,
        dumpRelativePath: null,
        status: "failed",
        error: "Could not parse Drive file id.",
        directUrl: null,
      });
      failed += 1;
      console.log(`${label}: FAILED (no Drive id)`);
      continue;
    }

    try {
      const downloaded = await downloadDriveBytes(driveId, row.name);
      const optimized = await optimizeGalleryImage({
        bytes: downloaded.bytes,
        mimeType: downloaded.mimeType,
        originalFileName: row.name,
        byteLength: downloaded.bytes.byteLength,
      });

      if (!optimized.success) {
        throw new Error(optimized.error);
      }

      const storagePath = buildGalleryImageStoragePath(optimized.fileName);
      const { objectPath } = splitGalleryImageStoragePath(storagePath);

      const upload = await galleryStorageRepository.uploadGalleryImage(
        client,
        storagePath,
        new Uint8Array(optimized.buffer),
        optimized.contentType,
        { upsert: true }
      );
      if (upload.error) {
        throw new Error(upload.error.message);
      }

      const directUrl = galleryStorageRepository.getGalleryImagePublicUrl(
        client,
        storagePath
      );

      const dumpAbsolute = path.join(dumpDir, objectPath);
      await mkdir(path.dirname(dumpAbsolute), { recursive: true });
      await writeFile(dumpAbsolute, optimized.buffer);

      await upsertDbRow(
        client,
        existingByDriveUrl,
        existingByName,
        row.name,
        row.url,
        directUrl
      );

      const dumpRelativePath = path
        .join(DUMP_DIR_RELATIVE, objectPath)
        .replace(/\\/g, "/");

      items.push({
        name: row.name,
        driveUrl: row.url,
        driveId,
        objectPath,
        dumpRelativePath,
        status: "ok",
        error: null,
        directUrl,
      });
      ok += 1;
      console.log(`${label}: ok → ${objectPath}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown migrate error.";
      items.push({
        name: row.name,
        driveUrl: row.url,
        driveId,
        objectPath: null,
        dumpRelativePath: null,
        status: "failed",
        error: message,
        directUrl: null,
      });
      failed += 1;
      console.log(`${label}: FAILED (${message})`);
    }

    await sleep(BETWEEN_DOWNLOADS_MS);
  }

  const manifest: Manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: JSON_RELATIVE.replace(/\\/g, "/"),
    mode: "drive",
    items,
  };
  await writeManifest(manifest);

  console.log("");
  console.log(
    `Done. ok=${ok} skipped=${skipped} failed=${failed} → ${MANIFEST_RELATIVE.replace(/\\/g, "/")}`
  );
  console.log(
    `Dump folder: ${DUMP_DIR_RELATIVE.replace(/\\/g, "/")}`
  );
  if (failed > 0) {
    console.log("Re-run the same command to retry failed items (ok ones skip).");
    process.exitCode = 1;
  }
}

async function migrateFromDump() {
  const manifest = await loadManifest();
  const ready = manifest.items.filter(
    (item) => item.status === "ok" && item.objectPath && item.dumpRelativePath
  );

  if (ready.length === 0) {
    throw new Error(
      "No successful dump items in manifest. Run npm run migrate:gallery-drive first."
    );
  }

  const client = createSeedAdminClient();
  const existing = await galleryImageRepository.listAllGalleryImages(client);
  if (existing.error) {
    throw new Error(existing.error.message);
  }

  const existingByDriveUrl = new Map<
    string,
    { id: string; name: string; direct_url: string }
  >();
  const existingByName = new Map<
    string,
    { id: string; name: string; direct_url: string }
  >();

  for (const row of existing.data ?? []) {
    existingByName.set(row.name, row);
    if (!getGalleryImageObjectPathFromPublicUrl(row.direct_url)) {
      existingByDriveUrl.set(row.direct_url, row);
    }
  }

  let ok = 0;
  let failed = 0;

  console.log(
    `Restoring ${ready.length} gallery image(s) from dump → ${GALLERY_STORAGE_BUCKET}…`
  );

  for (let index = 0; index < ready.length; index += 1) {
    const item = ready[index]!;
    const label = `[${index + 1}/${ready.length}] ${item.name}`;

    try {
      const absolute = path.join(process.cwd(), item.dumpRelativePath!);
      const buffer = await readFile(absolute);
      const storagePath = `${GALLERY_STORAGE_BUCKET}/${item.objectPath}`;

      const upload = await galleryStorageRepository.uploadGalleryImage(
        client,
        storagePath,
        new Uint8Array(buffer),
        "image/webp",
        { upsert: true }
      );
      if (upload.error) {
        throw new Error(upload.error.message);
      }

      const directUrl = galleryStorageRepository.getGalleryImagePublicUrl(
        client,
        storagePath
      );

      await upsertDbRow(
        client,
        existingByDriveUrl,
        existingByName,
        item.name,
        item.driveUrl,
        directUrl
      );

      item.directUrl = directUrl;
      item.status = "ok";
      item.error = null;
      ok += 1;
      console.log(`${label}: ok`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown restore error.";
      item.status = "failed";
      item.error = message;
      failed += 1;
      console.log(`${label}: FAILED (${message})`);
    }
  }

  const nextManifest: Manifest = {
    ...manifest,
    generatedAt: new Date().toISOString(),
    mode: "dump",
    items: manifest.items,
  };
  await writeManifest(nextManifest);

  console.log("");
  console.log(`Done. ok=${ok} failed=${failed}`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

async function main() {
  const fromDump = process.argv.includes("--from-dump");
  if (fromDump) {
    await migrateFromDump();
    return;
  }
  await migrateFromDrive();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
