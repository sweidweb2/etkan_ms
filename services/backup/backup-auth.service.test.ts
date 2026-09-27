import { describe, expect, it } from "vitest";
import { parseAuthSchemaBackupPayload } from "@/services/backup/backup-auth.service";

describe("parseAuthSchemaBackupPayload", () => {
  it("normalizes table rows from the RPC payload", () => {
    const payload = parseAuthSchemaBackupPayload({
      exportedAt: "2026-09-27T00:00:00.000Z",
      tables: {
        users: [{ id: "u1" }],
        identities: [{ id: "i1" }],
      },
    });

    expect(payload.scope).toBe("auth");
    expect(payload.tables.users).toEqual([{ id: "u1" }]);
    expect(payload.tables.identities).toEqual([{ id: "i1" }]);
  });

  it("rejects a malformed payload", () => {
    expect(() => parseAuthSchemaBackupPayload(null)).toThrow(
      "Unable to export auth users."
    );
  });
});
