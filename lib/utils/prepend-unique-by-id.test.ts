import { describe, expect, it } from "vitest";
import {
  appendUniqueById,
  prependUniqueById,
  prependUniqueByKey,
} from "@/lib/utils/prepend-unique-by-id";

type Row = { id: string; name: string };
type StudentLike = { user_id: string; name: string };

describe("prependUniqueById", () => {
  it("prepends a new row", () => {
    const current: Row[] = [{ id: "a", name: "A" }];
    const created: Row = { id: "b", name: "B" };

    expect(prependUniqueById(current, created)).toEqual([
      { id: "b", name: "B" },
      { id: "a", name: "A" },
    ]);
  });

  it("drops current rows that match created ids", () => {
    const current: Row[] = [
      { id: "b", name: "B from props" },
      { id: "a", name: "A" },
    ];
    const created: Row = { id: "b", name: "B from action" };

    expect(prependUniqueById(current, created)).toEqual([
      { id: "b", name: "B from action" },
      { id: "a", name: "A" },
    ]);
  });

  it("prepends multiple created rows", () => {
    const current: Row[] = [{ id: "a", name: "A" }];
    const created: Row[] = [
      { id: "b", name: "B" },
      { id: "c", name: "C" },
    ];

    expect(prependUniqueById(current, created)).toEqual([
      { id: "b", name: "B" },
      { id: "c", name: "C" },
      { id: "a", name: "A" },
    ]);
  });
});

describe("appendUniqueById", () => {
  it("appends without duplicating an id already in current", () => {
    const current: Row[] = [
      { id: "a", name: "A" },
      { id: "b", name: "B from props" },
    ];
    const created: Row = { id: "b", name: "B from action" };

    expect(appendUniqueById(current, created)).toEqual([
      { id: "a", name: "A" },
      { id: "b", name: "B from action" },
    ]);
  });
});

describe("prependUniqueByKey", () => {
  it("dedupes by a custom key", () => {
    const current: StudentLike[] = [
      { user_id: "u1", name: "From props" },
      { user_id: "u2", name: "Other" },
    ];
    const created: StudentLike = { user_id: "u1", name: "From action" };

    expect(
      prependUniqueByKey(current, created, (row) => row.user_id)
    ).toEqual([
      { user_id: "u1", name: "From action" },
      { user_id: "u2", name: "Other" },
    ]);
  });
});
