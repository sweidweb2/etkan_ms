import { describe, expect, it } from "vitest";
import { roleSchema } from "@/lib/validators/role";
import { ROLES } from "@/lib/constants/roles";

describe("roleSchema", () => {
  it("accepts all application roles", () => {
    for (const role of Object.values(ROLES)) {
      expect(roleSchema.safeParse(role).success).toBe(true);
    }
  });

  it("rejects legacy or unknown roles", () => {
    expect(roleSchema.safeParse("customer").success).toBe(false);
    expect(roleSchema.safeParse("superadmin").success).toBe(false);
  });
});
