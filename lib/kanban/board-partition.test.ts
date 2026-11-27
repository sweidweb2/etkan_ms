import { describe, expect, it } from "vitest";
import { assertCompleteIdPartition } from "@/lib/kanban/board-partition";

const messages = {
  outOfDate: "Board is out of date.",
  notFound: "Not found.",
};

describe("assertCompleteIdPartition", () => {
  it("accepts a complete unique partition", () => {
    const known = new Set(["a", "b", "c"]);
    expect(
      assertCompleteIdPartition(known, ["b", "a", "c"], messages)
    ).toEqual({ ok: true });
  });

  it("rejects a partial board payload", () => {
    const known = new Set(["a", "b", "c"]);
    expect(assertCompleteIdPartition(known, ["a", "b"], messages)).toEqual({
      ok: false,
      error: messages.outOfDate,
    });
  });

  it("rejects unknown ids", () => {
    const known = new Set(["a"]);
    expect(assertCompleteIdPartition(known, ["a", "x"], messages)).toEqual({
      ok: false,
      error: messages.notFound,
    });
  });

  it("rejects duplicates", () => {
    const known = new Set(["a", "b"]);
    expect(
      assertCompleteIdPartition(known, ["a", "a", "b"], messages)
    ).toEqual({
      ok: false,
      error: messages.outOfDate,
    });
  });

  it("accepts empty when there are no known ids", () => {
    expect(assertCompleteIdPartition(new Set(), [], messages)).toEqual({
      ok: true,
    });
  });

  it("rejects empty placements when known ids exist", () => {
    expect(
      assertCompleteIdPartition(new Set(["a"]), [], messages)
    ).toEqual({
      ok: false,
      error: messages.outOfDate,
    });
  });
});
