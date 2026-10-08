#!/usr/bin/env node
/**
 * Bundle budget check (run from apps/web after `next build`).
 * Sums unique first-load JS per audited page from .next/build-manifest.json.
 * Fails (exit 1) if any page exceeds BUDGET_BYTES (default 500KB raw,
 * ≈160KB gz first-load per `next build` route table).
 */
const fs = require('fs');
const path = require('path');

const BUDGET = Number(process.env.BUDGET_BYTES || 500_000);
// App Router page keys from .next/app-build-manifest.json
const PAGES = (
  process.env.BUDGET_PAGES ||
  '/login/page,/(dashboard)/leaves/team-calendar/page,/(dashboard)/attendance/rosters/page,/(dashboard)/employee-relations/page'
).split(',');

const manifestPath = path.join(__dirname, '..', '.next', 'app-build-manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('build-manifest.json not found — run `next build` first');
  process.exit(2);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

let failed = false;
console.log(`Bundle budget: ${(BUDGET / 1024).toFixed(0)} KB raw per page\n`);
for (const page of PAGES) {
  const files = manifest.pages[page];
  if (!files) {
    console.log(`  ${page}: NOT IN MANIFEST (skipped)`);
    continue;
  }
  const js = [...new Set(files.filter((f) => f.endsWith('.js')))];
  let bytes = 0;
  for (const f of js) {
    const p = path.join(__dirname, '..', '.next', f);
    try {
      bytes += fs.statSync(p).size;
    } catch {
      console.log(`  WARN missing chunk: ${f}`);
    }
  }
  const kb = (bytes / 1024).toFixed(1);
  const ok = bytes <= BUDGET;
  if (!ok) failed = true;
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${page}: ${kb} KB (${js.length} chunks)`);
}
if (failed) {
  console.error('\nBundle budget exceeded — investigate with ANALYZE=true npm run build');
  process.exit(1);
}
console.log('\nAll audited pages within budget.');
