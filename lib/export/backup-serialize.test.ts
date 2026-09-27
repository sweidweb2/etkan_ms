import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { BACKUP_EXPORT_FORMATS } from "@/lib/constants/backup-formats";
import {
  serializeBackupExport,
  serializeTableRowsToCsv,
  serializeTableRowsToSql,
} from "@/lib/export/backup-serialize";
import type { BackupExportPayload } from "@/types/backup-export";

describe("serializeTableRowsToSql", () => {
  it("quotes identifiers and escapes string values", () => {
    const sql = serializeTableRowsToSql("profiles", [
      { id: "a'b", name: "Ada", active: true, score: 12, notes: null },
    ]);

    expect(sql).toContain('INSERT INTO "profiles"');
    expect(sql).toContain("'a''b'");
    expect(sql).toContain("TRUE");
    expect(sql).toContain("NULL");
    expect(sql).toContain("12");
  });

  it("serializes nested objects as jsonb", () => {
    const sql = serializeTableRowsToSql("notifications", [
      { id: "1", payload: { ok: true } },
    ]);

    expect(sql).toContain(`'{"ok":true}'::jsonb`);
  });

  it("serializes string arrays as text[]", () => {
    const sql = serializeTableRowsToSql("student_registration_applications", [
      { id: "1", skills: ["web_dev", "english"], available_days: ["sun"] },
    ]);

    expect(sql).toContain(`ARRAY['web_dev', 'english']::text[]`);
    expect(sql).toContain(`ARRAY['sun']::text[]`);
    expect(sql).not.toContain("::jsonb");
  });

  it("defers instructor_schedule_slots source_slot_id until after inserts", () => {
    const sql = serializeTableRowsToSql("instructor_schedule_slots", [
      {
        id: "child",
        source_workshop_id: "workshop-1",
        source_slot_id: "parent",
      },
      {
        id: "parent",
        source_workshop_id: null,
        source_slot_id: null,
      },
    ]);

    expect(sql).toContain(
      `VALUES ('child', 'workshop-1', NULL)`
    );
    expect(sql).toContain(
      `UPDATE "instructor_schedule_slots" SET "source_slot_id" = 'parent' WHERE "id" = 'child';`
    );
    expect(sql.indexOf("INSERT INTO")).toBeLessThan(sql.indexOf("UPDATE"));
  });

  it("defers student_financial_form_invites form_id until after inserts", () => {
    const sql = serializeTableRowsToSql("student_financial_form_invites", [
      { id: "invite-1", form_id: "form-1" },
    ]);

    expect(sql).toContain(`VALUES ('invite-1', NULL)`);
    expect(sql).toContain(
      `UPDATE "student_financial_form_invites" SET "form_id" = 'form-1' WHERE "id" = 'invite-1';`
    );
  });
});

describe("serializeTableRowsToCsv", () => {
  it("quotes commas and doubled quotes", () => {
    const csv = serializeTableRowsToCsv([
      { name: "Ada, Lovelace", note: 'said "hello"' },
    ]);

    expect(csv).toBe('name,note\n"Ada, Lovelace","said ""hello"""\n');
  });
});

describe("serializeBackupExport", () => {
  const tablePayload: BackupExportPayload = {
    exportedAt: "2026-08-19T00:00:00.000Z",
    scope: "table",
    table: "subjects",
    rows: [{ id: "1", name: "Robotics" }],
  };

  it("pretty-prints JSON", async () => {
    const file = await serializeBackupExport(
      tablePayload,
      BACKUP_EXPORT_FORMATS.JSON
    );

    expect(file.extension).toBe("json");
    expect(file.contentType).toContain("application/json");
    expect(file.body).toContain('"scope": "table"');
  });

  it("zips one csv per table for a full csv export", async () => {
    const fullPayload = {
      exportedAt: "2026-08-19T00:00:00.000Z",
      scope: "all",
      tables: {
        subjects: [{ id: "1" }],
        profiles: [{ id: "2" }],
      },
    } as BackupExportPayload;
    const file = await serializeBackupExport(
      fullPayload,
      BACKUP_EXPORT_FORMATS.CSV
    );

    expect(file.extension).toBe("zip");
    expect(file.contentType).toBe("application/zip");

    const zip = await JSZip.loadAsync(file.body);
    expect(Object.keys(zip.files).sort()).toEqual(["profiles.csv", "subjects.csv"]);
  });

  it("emits deferred foreign keys after all table inserts in a full SQL export", async () => {
    const fullPayload = {
      exportedAt: "2026-08-19T00:00:00.000Z",
      scope: "all",
      tables: {
        student_financial_form_invites: [{ id: "invite-1", form_id: "form-1" }],
        student_financial_forms: [{ id: "form-1", invite_id: "invite-1" }],
      },
    } as BackupExportPayload;

    const file = await serializeBackupExport(
      fullPayload,
      BACKUP_EXPORT_FORMATS.SQL
    );

    expect(typeof file.body).toBe("string");
    const sql = file.body as string;
    expect(sql).toContain("-- Contents: public table rows");
    const formsInsertAt = sql.indexOf(
      `INSERT INTO "student_financial_forms"`
    );
    const inviteUpdateAt = sql.indexOf(
      `UPDATE "student_financial_form_invites" SET "form_id"`
    );

    expect(sql).toContain(`VALUES ('invite-1', NULL)`);
    expect(formsInsertAt).toBeGreaterThan(-1);
    expect(inviteUpdateAt).toBeGreaterThan(formsInsertAt);
  });
});
