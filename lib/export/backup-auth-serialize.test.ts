import { describe, expect, it } from "vitest";
import { serializeAuthSchemaBackupToSql } from "@/lib/export/backup-auth-serialize";

describe("serializeAuthSchemaBackupToSql", () => {
  it("inserts users before identities and skips generated columns", () => {
    const sql = serializeAuthSchemaBackupToSql({
      exportedAt: "2026-09-27T00:00:00.000Z",
      scope: "auth",
      tables: {
        users: [
          {
            id: "user-1",
            email: "ada@example.com",
            encrypted_password: "hash",
            confirmed_at: "2026-01-01T00:00:00.000Z",
            raw_app_meta_data: { provider: "email" },
          },
        ],
        identities: [
          {
            id: "ident-1",
            user_id: "user-1",
            provider: "email",
            email: "ada@example.com",
            identity_data: { email: "ada@example.com" },
          },
        ],
      },
    });

    expect(sql).toContain('INSERT INTO "auth"."users"');
    expect(sql).toContain('INSERT INTO "auth"."identities"');
    expect(sql).toContain("'ada@example.com'");
    expect(sql).toContain("'hash'");
    expect(sql).toContain(`'{"provider":"email"}'::jsonb`);
    expect(sql).not.toContain("confirmed_at");
    expect(sql.indexOf('INSERT INTO "auth"."identities"')).toBeGreaterThan(
      sql.indexOf('INSERT INTO "auth"."users"')
    );
    const identitiesHeader = sql.slice(
      sql.indexOf('INSERT INTO "auth"."identities"'),
      sql.indexOf("VALUES", sql.indexOf('INSERT INTO "auth"."identities"'))
    );
    expect(identitiesHeader).not.toContain('"email"');
  });

  it("comments empty tables", () => {
    const sql = serializeAuthSchemaBackupToSql({
      exportedAt: "2026-09-27T00:00:00.000Z",
      scope: "auth",
      tables: { users: [], identities: [] },
    });

    expect(sql).toContain("-- No rows in auth.users");
    expect(sql).toContain("-- No rows in auth.identities");
  });
});
