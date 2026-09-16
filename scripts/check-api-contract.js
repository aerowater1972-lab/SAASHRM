/**
 * API contract check: every frontend api.*() call must match a backend
 * route (method + path template). Fails CI on mismatch so the 8
 * frontend/backend breakages found in the integration audit cannot recur.
 *
 * Usage: node scripts/check-api-contract.js (run from repo root)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.next', 'test-results', 'e2e', 'dist', 'coverage'].includes(e.name)) continue;
      walk(p, out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

// ---- backend: controller prefix + method routes + nearest preceding @Controller ----
function backendRoutes() {
  const routes = [];
  const files = walk(path.join(ROOT, 'apps/api/src/modules')).filter((f) => f.endsWith('.controller.ts'));
  for (const f of files) {
    const flat = fs.readFileSync(f, 'utf8').replace(/\s+/g, ' ');
    const ctrls = [];
    const cre = /@Controller\('([^']*)'\)|@Controller\(\)/g;
    let cm;
    while ((cm = cre.exec(flat)) !== null) ctrls.push({ idx: cm.index, prefix: cm[1] || '' });
    const re = /@(Get|Post|Put|Delete|Patch)\(\s*'([^']*)'\s*\)|@(Get|Post|Put|Delete|Patch)\(\s*\)/g;
    let mm;
    while ((mm = re.exec(flat)) !== null) {
      const method = (mm[1] || mm[3]).toUpperCase();
      const route = mm[2] !== undefined ? mm[2] : '';
      let ctrl = '';
      for (const c of ctrls) { if (c.idx < mm.index) ctrl = c.prefix; else break; }
      routes.push({ method, path: '/api/v1/' + [ctrl, route].filter(Boolean).join('/') });
    }
  }
  return routes;
}

// ---- frontend: api.*() calls + raw fetch to /api/v1 ----
function frontendCalls() {
  const calls = [];
  const files = [...walk(path.join(ROOT, 'apps/web/lib')), ...walk(path.join(ROOT, 'apps/web/app')), ...walk(path.join(ROOT, 'apps/web/components'))];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const rel = path.relative(ROOT, f);
    const re = /api\.(get|post|put|delete|patch)(?:<[^;()]*>)?\(\s*[`'"]([^`'"]+)[`'"]/g;
    let m;
    while ((m = re.exec(src)) !== null) calls.push({ method: m[1].toUpperCase(), path: m[2].split('?')[0], file: rel });
    const rf = /fetch\(\s*[`'"]([^`'"]*\/api\/v1[^`'"]*)[`'"]/g;
    while ((m = rf.exec(src)) !== null) {
      calls.push({ method: 'FETCH', path: m[1].split('?')[0].replace(/^.*\/api\/v1/, '') || '/', file: rel });
    }
  }
  return calls;
}

function segs(p) {
  p = p.replace(/\$\{[^}]*\}?/g, (m, off, str) => {
    const before = str[off - 1];
    const after = str[off + m.length] || '';
    if (before === '/' && (after === '/' || after === '' || after === '?')) return ':param';
    return '';
  });
  return p.split('?')[0].split('/').filter(Boolean);
}
function isParam(s) { return s.startsWith(':'); }
function matchPath(fe, be) {
  const a = segs(fe);
  let b = segs(be);
  if (b[0] === 'api' && b[1] === 'v1') b = b.slice(2);
  if (a.length !== b.length) return false;
  return a.every((s, i) => s === b[i] || isParam(s) || isParam(b[i]));
}

const routes = backendRoutes();
const calls = frontendCalls().filter((c) => c.method !== 'FETCH');
const byMethod = {};
routes.forEach((r) => { (byMethod[r.method] = byMethod[r.method] || []).push(r); });
const broken = calls.filter((c) => !(byMethod[c.method] || []).some((r) => matchPath(c.path, r.path)));
if (broken.length > 0) {
  console.error(`API CONTRACT BROKEN: ${broken.length} frontend call(s) match no backend route:`);
  const seen = new Set();
  broken.forEach((b) => {
    const k = `${b.method} ${b.path}`;
    if (seen.has(k)) return;
    seen.add(k);
    console.error(`  ${k}  (${b.file})`);
  });
  process.exit(1);
}
console.log(`API contract OK: ${calls.length} frontend calls, ${routes.length} backend routes.`);
