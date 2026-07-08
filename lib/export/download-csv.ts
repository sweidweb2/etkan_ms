type CsvColumn = {
  key: string;
  label: string;
};

type DownloadCsvOptions = {
  filename: string;
  columns: CsvColumn[];
  rows: Record<string, string | number | null>[];
};

function escapeCsvCell(value: string | number | null): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function downloadCsv({
  filename,
  columns,
  rows,
}: DownloadCsvOptions): void {
  const header = columns.map((column) => escapeCsvCell(column.label)).join(",");
  const body = rows
    .map((row) =>
      columns.map((column) => escapeCsvCell(row[column.key] ?? null)).join(",")
    )
    .join("\n");

  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function formatReportFilename(reportId: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${reportId}-${date}.csv`;
}
