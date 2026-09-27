import { describe, expect, it } from "vitest";
import { getSupabaseProjectRef } from "@/lib/supabase/project-ref";

describe("getSupabaseProjectRef", () => {
  it("reads the project ref from a hosted URL", () => {
    expect(
      getSupabaseProjectRef("https://diqqcfnrysgzeiqfadic.supabase.co")
    ).toBe("diqqcfnrysgzeiqfadic");
  });

  it("returns null for local or invalid URLs", () => {
    expect(getSupabaseProjectRef("http://127.0.0.1:54321")).toBeNull();
    expect(getSupabaseProjectRef("not-a-url")).toBeNull();
    expect(getSupabaseProjectRef(undefined)).toBeNull();
  });
});
