import { describe, expect, it } from "vitest";
import { BACKUP_EXPORT_FORMATS } from "@/lib/constants/backup-formats";
import { parseBackupExportFormat } from "@/lib/validators/manager/backup-export";

describe("parseBackupExportFormat", () => {
  it("defaults to json when the query param is missing", () => {
    expect(parseBackupExportFormat(null)).toEqual({
      success: true,
      data: BACKUP_EXPORT_FORMATS.JSON,
    });
  });

  it("accepts json, sql, csv, and business_csv", () => {
    expect(parseBackupExportFormat("sql")).toEqual({
      success: true,
      data: BACKUP_EXPORT_FORMATS.SQL,
    });
    expect(parseBackupExportFormat("csv")).toEqual({
      success: true,
      data: BACKUP_EXPORT_FORMATS.CSV,
    });
    expect(parseBackupExportFormat("business_csv")).toEqual({
      success: true,
      data: BACKUP_EXPORT_FORMATS.BUSINESS_CSV,
    });
  });

  it("rejects unknown extensions", () => {
    const parsed = parseBackupExportFormat("xml");
    expect(parsed.success).toBe(false);
  });
});
