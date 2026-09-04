import JSZip from "jszip";

export type PasswordResetXlsxRow = {
  username: string;
  email: string;
  role: string;
  password: string;
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function cellXml(value: string, row: number, col: number): string {
  const ref = `${columnName(col)}${row}`;
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

function columnName(indexZeroBased: number): string {
  let n = indexZeroBased;
  let name = "";
  do {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return name;
}

function sheetXml(rows: PasswordResetXlsxRow[]): string {
  const header = ["username", "email", "role", "password"];
  const sheetRows: string[] = [];

  sheetRows.push(
    `<row r="1">${header
      .map((value, col) => cellXml(value, 1, col))
      .join("")}</row>`
  );

  rows.forEach((row, index) => {
    const r = index + 2;
    const values = [row.username, row.email, row.role, row.password];
    sheetRows.push(
      `<row r="${r}">${values
        .map((value, col) => cellXml(value, r, col))
        .join("")}</row>`
    );
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetData>
    ${sheetRows.join("\n    ")}
  </sheetData>
</worksheet>`;
}

/**
 * Builds a minimal .xlsx (Office Open XML) workbook with plaintext password rows.
 * Uses existing jszip — no extra dependency.
 */
export async function buildPasswordResetXlsxBlob(
  rows: PasswordResetXlsxRow[]
): Promise<Blob> {
  const zip = new JSZip();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`
  );

  zip.folder("_rels")?.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
  );

  const xl = zip.folder("xl");
  xl?.file(
    "workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Passwords" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`
  );

  xl?.folder("_rels")?.file(
    "workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`
  );

  xl?.folder("worksheets")?.file("sheet1.xml", sheetXml(rows));

  const buffer = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
  });

  return new Blob([buffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function passwordResetXlsxFilename(role: string): string {
  const safeRole = role.replaceAll(/[^a-z0-9_-]+/gi, "-").toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);
  return `passwords-${safeRole}-${stamp}.xlsx`;
}
