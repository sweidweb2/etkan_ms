import {
  BACKUP_BUSINESS_CSV_CONFIG,
  getBusinessCsvLookupTables,
} from "@/lib/export/backup-business-csv-config";
import type { BackupTableName } from "@/lib/constants/backup-tables";

type Row = Record<string, unknown>;

function asRow(value: unknown): Row | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Row;
}

function toRows(values: unknown[]): Row[] {
  return values.flatMap((value) => {
    const row = asRow(value);
    return row ? [row] : [];
  });
}

function rowKey(row: Row, idColumn: string): string | null {
  const value = row[idColumn];
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

export type BusinessCsvLookupIndex = {
  getRow: (
    table: BackupTableName,
    id: string,
    idColumn?: string
  ) => Row | null;
  getLabel: (
    table: BackupTableName,
    id: unknown,
    labelColumn: string,
    idColumn?: string
  ) => string;
};

export function buildBusinessCsvLookupIndex(
  tables: Partial<Record<BackupTableName, unknown[]>>
): BusinessCsvLookupIndex {
  const rowsByTable = new Map<BackupTableName, Row[]>();
  const indexByTableColumn = new Map<string, Map<string, Row>>();

  for (const [tableName, rows] of Object.entries(tables) as [
    BackupTableName,
    unknown[],
  ][]) {
    rowsByTable.set(tableName, toRows(rows ?? []));
  }

  function getIndexedRows(
    table: BackupTableName,
    idColumn: string
  ): Map<string, Row> {
    const cacheKey = `${table}::${idColumn}`;
    const cached = indexByTableColumn.get(cacheKey);
    if (cached) {
      return cached;
    }

    const indexed = new Map<string, Row>();
    for (const row of rowsByTable.get(table) ?? []) {
      const key = rowKey(row, idColumn);
      if (key != null) {
        indexed.set(key, row);
      }
    }

    indexByTableColumn.set(cacheKey, indexed);
    return indexed;
  }

  function getRow(
    table: BackupTableName,
    id: string,
    idColumn = "id"
  ): Row | null {
    return getIndexedRows(table, idColumn).get(id) ?? null;
  }

  function getLabel(
    table: BackupTableName,
    id: unknown,
    labelColumn: string,
    idColumn = "id"
  ): string {
    if (id === null || id === undefined || id === "") {
      return "";
    }

    const row = getRow(table, String(id), idColumn);
    if (!row) {
      return "";
    }

    const label = row[labelColumn];
    if (label === null || label === undefined) {
      return "";
    }

    return String(label);
  }

  return { getRow, getLabel };
}

function formatRawValue(
  value: unknown,
  labels?: Readonly<Record<string, string>>
): unknown {
  if (value === null || value === undefined) {
    return "";
  }

  if (labels && (typeof value === "string" || typeof value === "number")) {
    const key = String(value);
    if (key in labels) {
      return labels[key];
    }
  }

  return value;
}

function resolveViaValue(
  index: BusinessCsvLookupIndex,
  fkValue: unknown,
  through: BackupTableName,
  throughColumn: string,
  from?: BackupTableName,
  labelColumn?: string,
  idColumn?: string
): unknown {
  if (fkValue === null || fkValue === undefined || fkValue === "") {
    return "";
  }

  const throughRow = index.getRow(through, String(fkValue));
  if (!throughRow) {
    return "";
  }

  const nextValue = throughRow[throughColumn];

  if (from && labelColumn) {
    return index.getLabel(from, nextValue, labelColumn, idColumn);
  }

  if (nextValue === null || nextValue === undefined) {
    return "";
  }

  return nextValue;
}

export function transformRowsToBusinessCsv(
  tableName: BackupTableName,
  rows: unknown[],
  index: BusinessCsvLookupIndex
): Record<string, unknown>[] {
  const config = BACKUP_BUSINESS_CSV_CONFIG[tableName];
  const tableRows = toRows(rows);

  return tableRows.map((row) => {
    const output: Record<string, unknown> = {};

    for (const column of config.columns) {
      if (column.kind === "raw") {
        output[column.header] = formatRawValue(
          row[column.column],
          column.labels
        );
        continue;
      }

      if (column.kind === "fk") {
        output[column.header] = index.getLabel(
          column.from,
          row[column.column],
          column.labelColumn,
          column.idColumn
        );
        continue;
      }

      if (column.kind === "via") {
        output[column.header] = resolveViaValue(
          index,
          row[column.column],
          column.through,
          column.throughColumn,
          column.from,
          column.labelColumn,
          column.idColumn
        );
        continue;
      }

      for (const part of column.parts) {
        output[part.header] = resolveViaValue(
          index,
          row[column.column],
          column.through,
          part.throughColumn,
          part.from,
          part.labelColumn,
          part.idColumn
        );
      }
    }

    return output;
  });
}

export function collectBusinessCsvLookupTableNames(
  tableName: BackupTableName
): BackupTableName[] {
  return getBusinessCsvLookupTables(tableName);
}

export function collectAllBusinessCsvLookupTableNames(
  tableNames: readonly BackupTableName[]
): BackupTableName[] {
  const required = new Set<BackupTableName>();

  for (const tableName of tableNames) {
    for (const lookup of getBusinessCsvLookupTables(tableName)) {
      required.add(lookup);
    }
  }

  return [...required].sort();
}
