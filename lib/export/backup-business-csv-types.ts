import type { BackupTableName } from "@/lib/constants/backup-tables";

export type BusinessCsvRawColumn = {
  kind: "raw";
  column: string;
  header: string;
  labels?: Readonly<Record<string, string>>;
};

export type BusinessCsvFkColumn = {
  kind: "fk";
  column: string;
  header: string;
  from: BackupTableName;
  labelColumn: string;
  /** Primary key column on the lookup table. Defaults to `id`. */
  idColumn?: string;
};

/** Resolve a display value through an intermediate row (one hop). */
export type BusinessCsvViaColumn = {
  kind: "via";
  column: string;
  header: string;
  through: BackupTableName;
  throughColumn: string;
  /** When set, `throughColumn` is treated as an FK into this table. */
  from?: BackupTableName;
  labelColumn?: string;
  idColumn?: string;
};

/** Expand one FK into several named columns via an intermediate row. */
export type BusinessCsvViaPartsColumn = {
  kind: "via_parts";
  column: string;
  through: BackupTableName;
  parts: readonly {
    header: string;
    throughColumn: string;
    from: BackupTableName;
    labelColumn: string;
    idColumn?: string;
  }[];
};

export type BusinessCsvColumn =
  | BusinessCsvRawColumn
  | BusinessCsvFkColumn
  | BusinessCsvViaColumn
  | BusinessCsvViaPartsColumn;

export type BusinessCsvTableConfig = {
  columns: readonly BusinessCsvColumn[];
};
