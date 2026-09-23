import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["src", "public"].filter((dir) => {
  try {
    return statSync(dir).isDirectory();
  } catch {
    return false;
  }
});

const forbiddenFrom = /\.from\(\s*['"](?:units|unit|lab_samples|sample_records)['"]/;
const probe = /\.select\(\s*['"]\*['"]\s*\)[\s\S]{0,80}\.limit\(\s*1\s*\)/;
const phantomSelect = /sample_number|verified_by_id|approved_by_id|rejection_reason/;
const auditClientWrite =
  /(?:insertRow|updateRow|deleteWhere)\(\s*[A-Za-z0-9_]+,\s*["']audit["']/;
const skipPhantom = new Set([
  "src/lib/data/forbidden.ts",
  "src/lib/supabase/lims-fetch.ts",
  "src/lib/supabase/guard.ts",
  "scripts/assert-no-forbidden-http.mjs",
]);

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, acc);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) acc.push(path);
  }
  return acc;
}

const files = roots.flatMap((root) => walk(root));
const failures = [];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  if (forbiddenFrom.test(text)) {
    failures.push(`${file}: from() on forbidden table`);
  }
  if (probe.test(text) && !file.includes("assert-no-forbidden-http")) {
    failures.push(`${file}: select('*').limit(1) probe`);
  }
  if (phantomSelect.test(text) && !skipPhantom.has(file)) {
    failures.push(`${file}: phantom sample column in source`);
  }
  if (auditClientWrite.test(text) && !file.includes("tables.ts")) {
    failures.push(`${file}: client write to audit_logs`);
  }
}

if (failures.length) {
  console.error("Forbidden HTTP / schema remnants:\n" + failures.join("\n"));
  process.exit(1);
}

console.log(`assert-no-forbidden-http: ${files.length} files clean`);
