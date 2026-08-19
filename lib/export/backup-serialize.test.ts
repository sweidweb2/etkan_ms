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
});
