import { describe, expect, it } from "vitest";
import {
  BACKUP_TABLES,
  BACKUP_TABLE_LABELS,
  getBackupTableOrderColumns,
} from "@/lib/constants/backup-tables";

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

  it("places stages before subjects", () => {
    expect(BACKUP_TABLES.indexOf("stages")).toBeLessThan(
      BACKUP_TABLES.indexOf("subjects")
    );
  });

  it("places subjects before instructor_subject_capability", () => {
    expect(BACKUP_TABLES.indexOf("subjects")).toBeLessThan(
      BACKUP_TABLES.indexOf("instructor_subject_capability")
    );
  });

  it("places financial form invites before submitted forms", () => {
    expect(BACKUP_TABLES.indexOf("student_financial_form_invites")).toBeLessThan(
      BACKUP_TABLES.indexOf("student_financial_forms")
    );
  });

  it("orders tables that have no id column by their primary key", () => {
    expect(getBackupTableOrderColumns("profiles")).toEqual(["id"]);
    expect(getBackupTableOrderColumns("permissions")).toEqual(["key"]);
    expect(getBackupTableOrderColumns("role_permissions")).toEqual([
      "role",
      "permission_key",
    ]);
    expect(getBackupTableOrderColumns("category_exercises")).toEqual([
      "category_id",
      "exercise_id",
    ]);
    expect(getBackupTableOrderColumns("subject_categories")).toEqual([
      "subject_id",
      "category_id",
    ]);
    expect(getBackupTableOrderColumns("subject_exercises")).toEqual([
      "subject_id",
      "exercise_id",
    ]);
  });
});
