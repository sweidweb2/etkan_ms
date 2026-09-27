import type {
  AuthBackupTableName,
  AuthSchemaBackupPayload,
} from "@/types/backup-auth";

const AUTH_GENERATED_COLUMNS: Record<AuthBackupTableName, readonly string[]> = {
  users: ["confirmed_at"],
  identities: ["email"],
};

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

function asRow(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function serializeAuthTable(
  tableName: AuthBackupTableName,
  rows: unknown[]
): string {
  const skip = new Set(AUTH_GENERATED_COLUMNS[tableName]);
  const tableRows = rows.flatMap((value) => {
    const row = asRow(value);
    return row ? [row] : [];
  });

  if (tableRows.length === 0) {
    return `-- No rows in auth.${tableName}\n`;
  }

  const columns = Object.keys(tableRows[0] ?? {}).filter(
    (column) => !skip.has(column)
  );
  const quotedColumns = columns.map(quoteIdent).join(", ");
  const values = tableRows
    .map((row) => {
      const cells = columns.map((column) => sqlLiteral(row[column]));
      return `  (${cells.join(", ")})`;
    })
    .join(",\n");

  return `INSERT INTO ${quoteIdent("auth")}.${quoteIdent(tableName)} (${quotedColumns})\nVALUES\n${values};\n`;
}

export function serializeAuthSchemaBackupToSql(
  payload: AuthSchemaBackupPayload
): string {
  const header = [
    "-- Etkan MS auth backup",
    `-- Exported at: ${payload.exportedAt}`,
    "-- Tables: auth.users, auth.identities",
    "-- Restores login emails and password hashes. Apply after schema migrations.",
    "",
  ].join("\n");

  return `${header}${serializeAuthTable("users", payload.tables.users)}\n${serializeAuthTable("identities", payload.tables.identities)}`;
}

export function createAuthBackupFilename(): string {
  const dateStamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `backup-auth-users-${dateStamp}.sql`;
}

export function createAuthSettingsBackupFilename(): string {
  const dateStamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `backup-auth-settings-${dateStamp}.json`;
}
