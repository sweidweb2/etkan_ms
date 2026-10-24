import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseProjectRef } from "@/lib/supabase/project-ref";

describe("getSupabaseProjectRef", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads the project ref from a hosted URL", () => {
    expect(
      getSupabaseProjectRef("https://diqqcfnrysgzeiqfadic.supabase.co")
    ).toBe("diqqcfnrysgzeiqfadic");
  });

  it("returns null for local or invalid URLs", () => {
    expect(getSupabaseProjectRef("http://127.0.0.1:54321")).toBeNull();
    expect(getSupabaseProjectRef("not-a-url")).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(getSupabaseProjectRef(undefined)).toBeNull();
  });
});
