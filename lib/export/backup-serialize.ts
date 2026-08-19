import JSZip from "jszip";
import {
  BACKUP_EXPORT_FORMATS,
  type BackupExportFormat,
} from "@/lib/constants/backup-formats";
import type { BackupTableName } from "@/lib/constants/backup-tables";
import type { BackupExportPayload } from "@/types/backup-export";

export type SerializedBackupFile = {
  body: string | Uint8Array;
  contentType: string;
  extension: string;
};

function asRow(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toRows(values: unknown[]): Record<string, unknown>[] {
  return values.flatMap((value) => {
    const row = asRow(value);
    return row ? [row] : [];
  });
}

function collectColumns(rows: Record<string, unknown>[]): string[] {
  const columns = new Set<string>();

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      columns.add(key);
    }
  }

  return [...columns];
}

function quoteIdent(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }

  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  if (typeof value === "object") {
    const json = JSON.stringify(value).replaceAll("'", "''");
    return `'${json}'::jsonb`;
  }

  return `'${String(value).replaceAll("'", "''")}'`;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const text =
    typeof value === "object" ? JSON.stringify(value) : String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export function serializeTableRowsToSql(
  tableName: BackupTableName,
  rows: unknown[]
): string {
  const tableRows = toRows(rows);
  const columns = collectColumns(tableRows);

  if (columns.length === 0 || tableRows.length === 0) {
    return `-- No rows in ${quoteIdent(tableName)}\n`;
  }

  const quotedTable = quoteIdent(tableName);
  const quotedColumns = columns.map(quoteIdent).join(", ");

  const inserts = tableRows.map((row) => {
    const values = columns.map((column) => sqlLiteral(row[column])).join(", ");
    return `INSERT INTO ${quotedTable} (${quotedColumns}) VALUES (${values});`;
  });

  return `${inserts.join("\n")}\n`;
}

export function serializeTableRowsToCsv(rows: unknown[]): string {
  const tableRows = toRows(rows);
  const columns = collectColumns(tableRows);

  if (columns.length === 0) {
    return "";
  }

  const header = columns.map((column) => csvCell(column)).join(",");
  const body = tableRows
    .map((row) => columns.map((column) => csvCell(row[column])).join(","))
    .join("\n");

  return tableRows.length === 0 ? `${header}\n` : `${header}\n${body}\n`;
}

function serializePayloadToSql(payload: BackupExportPayload): string {
  const header = [
    "-- Etkan MS backup",
    `-- Exported at: ${payload.exportedAt}`,
    `-- Scope: ${payload.scope}`,
    "",
  ].join("\n");

  if (payload.scope === "table") {
    return `${header}${serializeTableRowsToSql(payload.table, payload.rows)}`;
  }

  const sections = Object.entries(payload.tables).map(([tableName, rows]) => {
    return [
      `-- Table: ${tableName}`,
      serializeTableRowsToSql(tableName as BackupTableName, rows),
    ].join("\n");
  });

  return `${header}${sections.join("\n")}`;
}

async function serializePayloadToCsv(
  payload: BackupExportPayload
): Promise<SerializedBackupFile> {
  if (payload.scope === "table") {
    return {
      body: serializeTableRowsToCsv(payload.rows),
      contentType: "text/csv; charset=utf-8",
      extension: "csv",
    };
  }

  const zip = new JSZip();

  for (const [tableName, rows] of Object.entries(payload.tables)) {
    zip.file(`${tableName}.csv`, serializeTableRowsToCsv(rows));
  }

  const body = await zip.generateAsync({ type: "uint8array" });

  return {
    body,
    contentType: "application/zip",
    extension: "zip",
  };
}

export async function serializeBackupExport(
  payload: BackupExportPayload,
  format: BackupExportFormat
): Promise<SerializedBackupFile> {
  if (format === BACKUP_EXPORT_FORMATS.SQL) {
    return {
      body: serializePayloadToSql(payload),
      contentType: "application/sql; charset=utf-8",
      extension: "sql",
    };
  }

  if (format === BACKUP_EXPORT_FORMATS.CSV) {
    return serializePayloadToCsv(payload);
  }

  return {
    body: `${JSON.stringify(payload, null, 2)}\n`,
    contentType: "application/json; charset=utf-8",
    extension: "json",
  };
}

export function createBackupFilename({
  scope,
  tableName,
  extension,
}: {
  scope: "all" | "table";
  tableName?: string;
  extension: string;
}): string {
  const dateStamp = new Date().toISOString().replace(/[:.]/g, "-");

  if (scope === "table" && tableName) {
    return `backup-${tableName}-${dateStamp}.${extension}`;
  }

  return `backup-all-tables-${dateStamp}.${extension}`;
}
