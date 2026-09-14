/**
 * One-shot codemod: replace repeated Zod form parse failure boilerplate with
 * safeParseFormData / formValidationFailure.
 *
 * Run: npx tsx scripts/codemod-safe-parse-form-data.ts
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "lib", "validators", "manager");

const SIMPLE_PARSE_FN =
  /export function (parse\w+)\(formData: FormData\):\s*\|?\s*\{ success: true; data: [^}]+\}[\s\S]*?\{\s*const parsed = (\w+)\.safeParse\((\{[\s\S]*?\})\);\s*if \(!parsed\.success\) \{\s*(?:const flattened = parsed\.error\.flatten\(\)\.fieldErrors;\s*)?return \{\s*success: false,\s*error: "Please fix the errors below\.",\s*fieldErrors: zodFieldErrors\((?:flattened|parsed\.error\.flatten\(\)\.fieldErrors)\),\s*\};\s*\}\s*return \{ success: true, data: parsed\.data \};\s*\}/g;

const FAILURE_ONLY =
  /if \(!parsed\.success\) \{\s*(?:const flattened = parsed\.error\.flatten\(\)\.fieldErrors;\s*)?return \{\s*success: false,\s*error: "Please fix the errors below\.",\s*fieldErrors: zodFieldErrors\((?:flattened|parsed\.error\.flatten\(\)\.fieldErrors)\),\s*\};\s*\}/g;

const EARLY_FIELD_FAILURE =
  /return \{\s*success: false,\s*error: "Please fix the errors below\.",\s*fieldErrors: (\{[\s\S]*?\}),\s*\};/g;

function syncHelperImport(source: string): string {
  const withoutImport = source.replace(
    /import \{[^}]+\} from "@\/lib\/validators\/safe-parse-form-data";\r?\n/,
    ""
  );

  const needed: string[] = [];
  if (/\bsafeParseFormData\b/.test(withoutImport)) needed.push("safeParseFormData");
  if (/\bformValidationFailure\b/.test(withoutImport)) {
    needed.push("formValidationFailure");
  }
  if (/\bParseFormResult\b/.test(withoutImport)) needed.push("ParseFormResult");

  let next = withoutImport;
  if (needed.length > 0) {
    const importLine = `import { ${needed.join(", ")} } from "@/lib/validators/safe-parse-form-data";\n`;
    const zodImport = next.match(/^import \{ z \} from "zod";\r?\n/m);
    if (zodImport?.index != null) {
      const idx = zodImport.index + zodImport[0].length;
      next = next.slice(0, idx) + importLine + next.slice(idx);
    } else {
      const firstImport = next.match(/^import .+$/m);
      if (firstImport?.index != null) {
        next =
          next.slice(0, firstImport.index) +
          importLine +
          next.slice(firstImport.index);
      } else {
        next = importLine + next;
      }
    }
  }

  // Drop unused zodFieldErrors import
  if (
    !/\bzodFieldErrors\b/.test(
      next.replace(
        /import \{[^}]*zodFieldErrors[^}]*\} from "@\/lib\/validators\/auth\/parse-form";/,
        ""
      )
    )
  ) {
    next = next.replace(
      /import \{ zodFieldErrors \} from "@\/lib\/validators\/auth\/parse-form";\r?\n/,
      ""
    );
  }

  // Drop unused FieldErrors type import
  if (
    !/\bFieldErrors\b/.test(
      next.replace(
        /import type \{ FieldErrors \} from "@\/types\/auth";/,
        ""
      )
    )
  ) {
    next = next.replace(
      /import type \{ FieldErrors \} from "@\/types\/auth";\r?\n/,
      ""
    );
  }

  return next;
}

function transformFile(filePath: string): boolean {
  const original = fs.readFileSync(filePath, "utf8");
  if (!original.includes("Please fix the errors below.")) {
    return false;
  }

  let source = original;

  source = source.replace(
    SIMPLE_PARSE_FN,
    (_m, fnName: string, schema: string, values: string) =>
      `export function ${fnName}(formData: FormData) {\n  return safeParseFormData(${schema}, ${values});\n}`
  );

  source = source.replace(
    FAILURE_ONLY,
    `return formValidationFailure(zodFieldErrors(parsed.error.flatten().fieldErrors));`
  );

  source = source.replace(
    EARLY_FIELD_FAILURE,
    (_m, fieldErrors: string) => `return formValidationFailure(${fieldErrors});`
  );

  if (source === original) {
    return false;
  }

  source = syncHelperImport(source);
  fs.writeFileSync(filePath, source);
  return true;
}

const files = fs
  .readdirSync(ROOT)
  .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));

let updated = 0;
for (const file of files) {
  const full = path.join(ROOT, file);
  if (transformFile(full)) {
    updated += 1;
    console.log("updated", file);
  }
}
console.log(`Done. Updated ${updated} files.`);
