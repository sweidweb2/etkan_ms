import { describe, expect, it } from "vitest";
import { createAsyncSemaphore } from "@/lib/concurrency/async-semaphore";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe("createAsyncSemaphore", () => {
  it("rejects non-positive limits", () => {
    expect(() => createAsyncSemaphore(0)).toThrow(/limit/i);
    expect(() => createAsyncSemaphore(-1)).toThrow(/limit/i);
  });

  it("runs work immediately when under the limit", async () => {
    const semaphore = createAsyncSemaphore(2);
    const result = await semaphore.run(async () => "ok");
    expect(result).toBe("ok");
  });

  it("queues callers so active count never exceeds the limit", async () => {
    const semaphore = createAsyncSemaphore(1);
    let active = 0;
    let maxActive = 0;

    async function task(): Promise<void> {
      await semaphore.run(async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await delay(20);
        active -= 1;
      });
    }

    await Promise.all([task(), task(), task()]);
    expect(maxActive).toBe(1);
  });

  it("releases the slot when the work function throws", async () => {
    const semaphore = createAsyncSemaphore(1);

    await expect(
      semaphore.run(async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    const result = await semaphore.run(async () => "recovered");
    expect(result).toBe("recovered");
  });
});
