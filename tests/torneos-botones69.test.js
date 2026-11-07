/* Parche 69: botones de eliminatorias con idéntico tamaño en móvil */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const css = fs.readFileSync(
  path.join(__dirname, "../css/admin-eliminatorias68.css"),
  "utf8",
);
const html = fs.readFileSync(
  path.join(__dirname, "../admin/index.html"),
  "utf8",
);
test("Los botones del fixture eliminatorio comparten medidas y eliminan el margen heredado", () => {
  const block = css.slice(
    css.indexOf("/* 03/11/2026 · Parche 69: botones simétricos"),
  );
  assert.match(block, /\.admin-torneos \.bp-ko68-actions > button \{/);
  assert.match(block, /height:\s*44px;/);
  assert.match(block, /min-height:\s*44px;/);
  assert.match(block, /margin:\s*0;/);
  assert.match(block, /width:\s*100%/);
  assert.match(block, /box-sizing:\s*border-box/);
  assert.match(block, /align-items:\s*center/);
  assert.match(block, /justify-content:\s*center/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(html, /admin-eliminatorias68\.css/);
});
