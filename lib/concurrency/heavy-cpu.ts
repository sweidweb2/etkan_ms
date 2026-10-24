/**
 * Process-global limits for CPU-heavy work on the Next request path
 * (Sharp encodes, JSZip generateAsync). Same class as JWKS / session
 * shell caches: one Node process, not multi-region shared.
 *
 * Keeps dialog/download UX synchronous while preventing unbounded
 * concurrent Sharp/ZIP from starving the event loop under load.
 */

import "server-only";

import sharp from "sharp";
import { createAsyncSemaphore } from "@/lib/concurrency/async-semaphore";

const SHARP_LIMIT = 1;
const BACKUP_ZIP_LIMIT = 1;

type HeavyCpuStore = {
  sharpConfigured: boolean;
  sharpSemaphore: ReturnType<typeof createAsyncSemaphore>;
  backupZipSemaphore: ReturnType<typeof createAsyncSemaphore>;
};

declare global {
  var __etkanHeavyCpu: HeavyCpuStore | undefined;
}

function getStore(): HeavyCpuStore {
  if (!globalThis.__etkanHeavyCpu) {
    globalThis.__etkanHeavyCpu = {
      sharpConfigured: false,
      sharpSemaphore: createAsyncSemaphore(SHARP_LIMIT),
      backupZipSemaphore: createAsyncSemaphore(BACKUP_ZIP_LIMIT),
    };
  }
  return globalThis.__etkanHeavyCpu;
}

function ensureSharpThreadLimit(): void {
  const store = getStore();
  if (store.sharpConfigured) {
    return;
  }
  // One libvips thread pool slot per process — pairs with the semaphore.
  sharp.concurrency(1);
  store.sharpConfigured = true;
}

/** Serialize Sharp metadata/encode work across the Node process. */
export function runWithSharpLimit<T>(fn: () => Promise<T>): Promise<T> {
  ensureSharpThreadLimit();
  return getStore().sharpSemaphore.run(fn);
}

/** Serialize backup ZIP compression (JSZip generateAsync). */
export function runWithBackupZipLimit<T>(fn: () => Promise<T>): Promise<T> {
  return getStore().backupZipSemaphore.run(fn);
}
