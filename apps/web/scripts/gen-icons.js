const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const svgPath = path.resolve(__dirname, '..', 'app', 'icon.svg');
  const outDir = path.resolve(__dirname, '..', 'public', 'icons');
  fs.mkdirSync(outDir, { recursive: true });

  const svg = fs.readFileSync(svgPath, 'utf8');
  const browser = await chromium.launch();

  async function shot(size, file, { maskable = false } = {}) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    // Maskable: shrink art to 80% centered on solid brand bg (safe zone).
    const inner = maskable
      ? `<div style="width:100%;height:100%;background:#2563EB;display:flex;align-items:center;justify-content:center"><div style="width:80%;height:80%">${svg}</div></div>`
      : `<div style="width:100%;height:100%">${svg}</div>`;
    await page.setContent(
      `<html><body style="margin:0;padding:0">${inner}</body></html>`,
    );
    await page.screenshot({ path: path.join(outDir, file) });
    await page.close();
    const bytes = fs.statSync(path.join(outDir, file)).size;
    console.log(`${file}: ${size}x${size} (${(bytes / 1024).toFixed(1)} KB)`);
  }

  await shot(192, 'icon-192.png');
  await shot(512, 'icon-512.png');
  await shot(512, 'icon-maskable-512.png', { maskable: true });
  // Apple touch icon (180x180, no transparency issues on solid bg)
  await shot(180, 'apple-touch-icon.png');

  await browser.close();
  console.log('done:', outDir);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
