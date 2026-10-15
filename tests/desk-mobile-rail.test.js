// The phone's bottom bar wears the Drumee Mobile frames' bar (the tours' own):
// a pill of four tabs and a round apps button for Access.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const SRC = path.join(__dirname, "..", "src/drumee");

test("mobile rail skeleton: pill of four tabs, Access as the apps circle, contract names kept", () => {
  const src = fs.readFileSync(path.join(SRC, "modules/desk/skeleton/index.js"), "utf8");
  const body = src.slice(src.indexOf("const _build_mobile_rail"), src.indexOf("// Mobile search card"));
  assert.match(body, /__mrail-pill/);
  for (const k of ["files", "chat", "task", "meet"]) {
    assert.match(body, new RegExp(`service: "rail-${k}", pn: "mrail-${k}", badge: "mrail-badge-${k}"`));
  }
  assert.match(body, /className: `\$\{fig\}__mrail-apps`[\s\S]*service: "rail-access"[\s\S]*radio: "mobile-rail-radio"[\s\S]*sys_pn: "mrail-access"/);
  assert.match(body, /radio: "mobile-rail-radio"/);
});

test("mobile rail skin: the tours' bar values", () => {
  const sass = require("sass");
  const css = sass.compile(path.join(SRC, "modules/desk/skin/mobile-rail.scss"),
    { loadPaths: [SRC, path.join(SRC, "skin")] }).css.replace(/\s+/g, " ");
  assert.match(css, /\.desk-module__mrail-pill \{[^}]*border-radius: 1000px/);
  assert.match(css, /\.desk-module__mrail-item\[data-radio=on\][^{]*\{[^}]*background-color: rgba\(89, 80, 255, 0\.1\)/);
  assert.match(css, /\.desk-module__mrail-apps \{[^}]*width: 54px/);
  assert.match(css, /\.desk-module__body\[data-device=mobile\] \{[^}]*calc\(78px/);
});
