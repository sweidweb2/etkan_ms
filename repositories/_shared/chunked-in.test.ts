import { describe, expect, it, vi } from "vitest";
import { chunkedIn } from "@/repositories/_shared/chunked-in";

describe("chunkedIn", () => {
  it("returns empty without querying for no ids", async () => {
    const runChunk = vi.fn();
    expect(await chunkedIn([], runChunk)).toEqual({ data: [], error: null });
    expect(runChunk).not.toHaveBeenCalled();
  });

  it("splits ids into chunks and concatenates rows", async () => {
    const runChunk = vi.fn(async (chunk: string[]) => ({
      data: chunk.map((id) => ({ id })),
      error: null,
    }));
    const ids = ["a", "b", "c", "d", "e"];

    const result = await chunkedIn(ids, runChunk, 2);

    expect(runChunk).toHaveBeenCalledTimes(3);
    expect(result.data?.map((row) => row.id)).toEqual(ids);
  });

  it("dedupes ids before chunking", async () => {
    const runChunk = vi.fn(async (chunk: string[]) => ({
      data: chunk,
      error: null,
    }));

    const result = await chunkedIn(["a", "a", "b"], runChunk);

    expect(runChunk).toHaveBeenCalledWith(["a", "b"]);
    expect(result.data).toEqual(["a", "b"]);
  });

  it("returns the first chunk error", async () => {
    const result = await chunkedIn(
      ["a", "b", "c"],
      async (chunk) =>
        chunk.includes("c")
          ? { data: null, error: { message: "boom" } }
          : { data: chunk, error: null },
      2
    );

    expect(result).toEqual({ data: null, error: { message: "boom" } });
  });
});
