import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "lib", "validators", "manager");
const BAD =
  /return formValidationFailure\(zodFieldErrors\(parsed\.error\.flatten\(\)\.fieldErrors\)\);/g;
const GOOD = `if (!parsed.success) {
    return formValidationFailure(zodFieldErrors(parsed.error.flatten().fieldErrors));
  }`;

let n = 0;
for (const file of fs
  .readdirSync(ROOT)
  .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
  const full = path.join(ROOT, file);
  const src = fs.readFileSync(full, "utf8");
  if (!src.includes(
    "return formValidationFailure(zodFieldErrors(parsed.error.flatten().fieldErrors));"
  )) {
    continue;
  }
  const next = src.replace(BAD, GOOD);
  fs.writeFileSync(full, next);
  n += 1;
  console.log("fixed", file);
}
console.log("fixed count", n);
