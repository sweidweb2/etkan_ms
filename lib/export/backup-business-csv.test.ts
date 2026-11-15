import { describe, expect, it } from "vitest";
import { BACKUP_TABLES } from "@/lib/constants/backup-tables";
import { BACKUP_EXPORT_FORMATS } from "@/lib/constants/backup-formats";
import {
  BACKUP_BUSINESS_CSV_CONFIG,
  getBusinessCsvLookupTables,
} from "@/lib/export/backup-business-csv-config";
import {
  buildBusinessCsvLookupIndex,
  transformRowsToBusinessCsv,
} from "@/lib/export/backup-business-csv";
import {
  createBackupFilename,
  serializeBackupExport,
  serializeTableRowsToCsv,
} from "@/lib/export/backup-serialize";

describe("BACKUP_BUSINESS_CSV_CONFIG", () => {
  it("covers every backup table", () => {
    for (const table of BACKUP_TABLES) {
      expect(BACKUP_BUSINESS_CSV_CONFIG[table]?.columns.length).toBeGreaterThan(
        0
      );
    }
  });

  it("lists workshops as a lookup for workshop_sessions", () => {
    expect(getBusinessCsvLookupTables("workshop_sessions")).toEqual([
      "workshops",
    ]);
  });
});

describe("transformRowsToBusinessCsv", () => {
  it("replaces workshop_id with workshop name and omits raw ids", () => {
    const index = buildBusinessCsvLookupIndex({
      workshops: [{ id: "w1", name: "Robotics Bootcamp" }],
      workshop_sessions: [
        {
          id: "s1",
          workshop_id: "w1",
          nb_order: 1,
          topic: "Intro",
          session_date: "2026-01-10",
          start_time: "09:00",
          end_time: "11:00",
          nb_hours: 2,
          status: "planned",
          session_eval: null,
          participants_eval: null,
          notes: null,
          suggestions: null,
        },
      ],
    });

    const rows = transformRowsToBusinessCsv(
      "workshop_sessions",
      [
        {
          id: "s1",
          workshop_id: "w1",
          nb_order: 1,
          topic: "Intro",
          session_date: "2026-01-10",
          start_time: "09:00",
          end_time: "11:00",
          nb_hours: 2,
          status: "planned",
          session_eval: null,
          participants_eval: null,
          notes: null,
          suggestions: null,
        },
      ],
      index
    );

    expect(rows).toEqual([
      {
        Workshop: "Robotics Bootcamp",
        Order: 1,
        Topic: "Intro",
        "Session date": "2026-01-10",
        "Start time": "09:00",
        "End time": "11:00",
        Hours: 2,
        Status: "Planned",
        "Session eval": "",
        "Participants eval": "",
        Notes: "",
        Suggestions: "",
      },
    ]);

    const csv = serializeTableRowsToCsv(rows);
    expect(csv).toContain("Workshop,Order,Topic");
    expect(csv).toContain("Robotics Bootcamp");
    expect(csv).not.toContain("workshop_id");
    expect(csv).not.toContain("w1");
    expect(csv).not.toContain("s1");
  });

  it("expands student_payment_phase_id into student and phase names", () => {
    const index = buildBusinessCsvLookupIndex({
      profiles: [{ id: "u1", full_name: "Ada Lovelace" }],
      payment_phases: [{ id: "p1", name: "Spring 2026" }],
      student_payment_phases: [
        { id: "spp1", student_id: "u1", payment_phase_id: "p1" },
      ],
    });

    const rows = transformRowsToBusinessCsv(
      "student_payments",
      [
        {
          id: "pay1",
          student_payment_phase_id: "spp1",
          amount: 100,
          type: "credit",
          payment_date: "2026-02-01",
          payment_method: "cash",
          receipt_number: "R1",
          received_by: "Front desk",
          received_by_management: false,
          notes: null,
          semester_drop_request_id: null,
        },
      ],
      index
    );

    expect(rows[0]?.Student).toBe("Ada Lovelace");
    expect(rows[0]?.["Payment phase"]).toBe("Spring 2026");
    expect(rows[0]).not.toHaveProperty("student_payment_phase_id");
  });
});

describe("serializeBackupExport business_csv", () => {
  it("serializes a single-table business csv using lookups", async () => {
    const file = await serializeBackupExport(
      {
        exportedAt: "2026-08-19T00:00:00.000Z",
        scope: "table",
        table: "workshop_sessions",
        rows: [
          {
            id: "s1",
            workshop_id: "w1",
            nb_order: 1,
            topic: "Intro",
            session_date: "2026-01-10",
            start_time: "09:00",
            end_time: "11:00",
            nb_hours: 2,
            status: "done",
            session_eval: 5,
            participants_eval: 4,
            notes: null,
            suggestions: null,
          },
        ],
        lookups: {
          workshops: [{ id: "w1", name: "AI Workshop" }],
        },
      },
      BACKUP_EXPORT_FORMATS.BUSINESS_CSV
    );

    expect(file.extension).toBe("csv");
    expect(file.contentType).toContain("text/csv");
    expect(file.body).toContain("AI Workshop");
    expect(file.body).toContain("Done");
    expect(file.body).not.toContain("w1");
  });
});

describe("createBackupFilename", () => {
  it("adds a business variant suffix", () => {
    const name = createBackupFilename({
      scope: "table",
      tableName: "workshop_sessions",
      extension: "csv",
      variant: "business",
    });

    expect(name).toMatch(
      /^backup-workshop_sessions-business-\d{4}-\d{2}-\d{2}T.+\.csv$/
    );
  });
});
