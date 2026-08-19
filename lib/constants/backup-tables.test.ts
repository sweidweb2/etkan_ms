import { describe, expect, it } from "vitest";
import { BACKUP_TABLES, BACKUP_TABLE_LABELS } from "@/lib/constants/backup-tables";

describe("BACKUP_TABLES", () => {
  it("lists each table once", () => {
    expect(new Set(BACKUP_TABLES).size).toBe(BACKUP_TABLES.length);
  });

  it("has a label for every listed table", () => {
    for (const tableName of BACKUP_TABLES) {
      expect(BACKUP_TABLE_LABELS[tableName].length).toBeGreaterThan(0);
    }
  });

  it("places workshops before instructor_schedule_slots", () => {
    expect(BACKUP_TABLES.indexOf("workshops")).toBeLessThan(
      BACKUP_TABLES.indexOf("instructor_schedule_slots")
    );
  });

  it("places financial form invites before submitted forms", () => {
    expect(BACKUP_TABLES.indexOf("student_financial_form_invites")).toBeLessThan(
      BACKUP_TABLES.indexOf("student_financial_forms")
    );
  });
});
