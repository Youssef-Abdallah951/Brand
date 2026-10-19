/* QA audit: every t("key") across src must exist in the translations dict. */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..", "src");

const dictSrc = fs.readFileSync(path.join(root, "i18n", "translations.ts"), "utf8");
const dictKeys = new Set(
  [...dictSrc.matchAll(/^\s{2}([a-zA-Z]+):\s*\{ en:/gm)].map((m) => m[1]),
);
const statusKeys = new Set(
  [...dictSrc.matchAll(/^\s{2}([a-zA-Z_]+):\s*\{ en:/gm)].map((m) => m[1]),
);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.tsx$|\.ts$/.test(e.name) ? [p] : [];
  });
}

const missing = [];
for (const file of walk(root)) {
  if (file.includes("translations.ts")) continue;
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(/\bt\("([a-zA-Z]+)"/g)) {
    if (!dictKeys.has(m[1])) missing.push(`${path.relative(root, file)}: ${m[1]}`);
  }
  // STATUS_LABEL.<status> usage audit
  for (const m of src.matchAll(/STATUS_LABEL\.([a-zA-Z_]+)/g)) {
    if (!statusKeys.has(m[1])) missing.push(`${path.relative(root, file)} (STATUS_LABEL): ${m[1]}`);
  }
}
if (missing.length) {
  console.log("MISSING KEYS:");
  missing.forEach((x) => console.log(" -", x));
} else {
  console.log("ALL t() + STATUS_LABEL KEYS RESOLVE (" + dictKeys.size + " dict entries)");
}
