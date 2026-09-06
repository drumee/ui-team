// Does the real Google-Drive import popup now match the card the tour spends
// three screens teaching?
//
// The tour draws a mock of that dialog (modules/desk/tutorial/migrate) and the
// user meets the real one (builtins/widget/migrate-gdrive-popup) the moment the
// tour ends. They are two files with two skins, so nothing but a measurement
// keeps them together.
//
// Run:  node tests/harness/migrate-dialog-parity.js
//
// It renders BOTH and prints the metrics that are supposed to agree. Rows
// marked ✗ are drift.
//
// EVERY STYLESHEET THE CASCADE NEEDS IS COMPILED HERE, including the theme
// tokens in router/skin/themes/light.scss. Leaving those out reports a white
// card as transparent and an 8px radius as 0 — the tokens are simply undefined
// and the declarations are dropped, silently.
const { execFileSync } = require("node:child_process");
const { writeFileSync, mkdtempSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const { renderModule, toHtml } = require("../helpers/render-skeleton.js");

const ROOT = join(__dirname, "../..");
const CHROME =
  process.env.CHROME ||
  ["chromium", "chromium-browser", "google-chrome"].find((c) => {
    try {
      execFileSync("which", [c], { stdio: "pipe" });
      return true;
    } catch (e) {
      return false;
    }
  });
if (!CHROME) throw new Error("no chromium on PATH; set CHROME=");

const sass = (entry) =>
  execFileSync("sass", ["-I", ".", "-I", "skin", "--no-source-map", entry], {
    cwd: join(ROOT, "src/drumee"),
    encoding: "utf8",
    maxBuffer: 1 << 26,
  });

let css = "";
for (const entry of [
  "skin/vars/revamp.scss",
  "router/skin/themes/light.scss",
  "modules/desk/tutorial/skin/index.scss",
  "modules/desk/tutorial/migrate/skin/index.scss",
  "builtins/widget/migrate-gdrive-popup/skin/index.scss",
]) {
  css += sass(entry);
}

// The markup media/grid/template/folder emits, shortened to the parts the CSS
// selects. The template itself is ESM and cannot be required by plain node, and
// the helper stubs `media/...` regardless — so the shape is reproduced here
// rather than imported. Read off that file: a `.media-grid__folder-art` box
// holding a `.folder-shape` carrying the AREA CLASS, plus a `.badge`.
const ART =
  '<div class="media-grid__folder-art">' +
  '<svg class="folder-shape personal" width="105" height="86" viewBox="0 0 105 86"><path d="M3 3h99v80H3z"/></svg>' +
  '<svg class="badge personal" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="white"/></svg>' +
  "</div>";

const ui = { fig: { family: "tutorial-migrate", group: "tutorial" }, mget: () => null };
const mock = toHtml(
  renderModule("src/drumee/modules/desk/tutorial/migrate/skeleton/index.js", ui, { dialog: true }, {}),
)
  // REPLACE the stub's text, do not prepend to it: it stringifies to
  // "[object Object]" and becomes a second flex item that shoves the art out
  // of its own centred box — which reads exactly like a layout bug that is
  // not there.
  .replace(/<div class="migrate-gdrive-popup__dest-ico">[^<]*/,
    '<div class="migrate-gdrive-popup__dest-ico">' + ART);

// The popup's shell, by hand. Its skeleton needs a large live stub (six states,
// a dozen getters) and none of that decides the card metrics under test, which
// live entirely in the classes below.
const popup = `
<div class="migrate-gdrive-popup migrate-gdrive-popup__ui" data-state="1"
     style="position:relative;top:auto;left:auto;transform:none">
  <div class="migrate-gdrive-popup__container">
    <div class="migrate-gdrive-popup__header">
      <div class="migrate-gdrive-popup__title-wrap">
        <div class="migrate-gdrive-popup__title">Import a folder or file</div>
      </div>
      <div class="migrate-gdrive-popup__close"><svg viewBox="0 0 16 16"><path d="M2 2l12 12"/></svg></div>
    </div>
    <div class="migrate-gdrive-popup__dest-card">
      <div class="migrate-gdrive-popup__dest-ico">${ART}</div>
      <div class="migrate-gdrive-popup__dest-text">
        <div class="migrate-gdrive-popup__field-label">Destination</div>
        <div class="migrate-gdrive-popup__destination">My home</div>
      </div>
    </div>
    <div class="migrate-gdrive-popup__entry">drumee-drive-import@…</div>
    <div class="migrate-gdrive-popup__primary-btn">Verify &amp; import</div>
  </div>
</div>`;

const W = 1368;
const H = 900;
const page = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0}${css}
/* The popup scales in over 0.22s. Measured mid-flight every one of its
   metrics reads ~3% small, which looks exactly like drift. */
*{animation:none!important;transition:none!important}</style>
<div class="tutorial tutorial__ui tutorial-main" data-size="wide" data-tour="migrate"
     style="position:relative;width:${W}px;height:${H}px;overflow:hidden">
  <div class="tutorial-main__content" style="width:100%;height:100%">${mock}</div>
</div>
${popup}
<script>
  const box = (s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const c = getComputedStyle(el);
    return {
      w: Math.round(b.width), h: Math.round(b.height),
      radius: c.borderTopLeftRadius, pad: c.paddingTop,
      size: c.fontSize, weight: c.fontWeight,
      bg: c.backgroundColor,
    };
  };
  document.title = JSON.stringify({
    mock: {
      card: box('.tutorial-migrate__dialog'),
      heading: box('.tutorial-migrate__heading'),
      close: box('.tutorial-migrate__close'),
      entry: box('.tutorial-migrate__entry'),
      submit: box('.tutorial-migrate__submit'),
      destIco: box('.tutorial-migrate__dialog .migrate-gdrive-popup__dest-ico'),
      destShape: box('.tutorial-migrate__dialog .folder-shape'),
    },
    popup: {
      card: box('.migrate-gdrive-popup__ui'),
      container: box('.migrate-gdrive-popup__container'),
      heading: box('.migrate-gdrive-popup__title'),
      close: box('.migrate-gdrive-popup__close'),
      entry: box('.migrate-gdrive-popup__entry'),
      submit: box('.migrate-gdrive-popup__primary-btn'),
      destIco: box('.migrate-gdrive-popup__ui .migrate-gdrive-popup__dest-ico'),
      destShape: box('.migrate-gdrive-popup__ui .folder-shape'),
    },
  });
</script>`;

const dir = mkdtempSync(join(tmpdir(), "mg-parity-"));
const file = join(dir, "parity.html");
writeFileSync(file, page);
const dom = execFileSync(
  CHROME,
  ["--headless", "--disable-gpu", "--no-sandbox", "--virtual-time-budget=1500",
   `--window-size=${W},${H}`, "--dump-dom", `file://${file}`],
  { encoding: "utf8", maxBuffer: 1 << 26 },
);
const data = JSON.parse(
  dom.match(/<title>([\s\S]*?)<\/title>/)[1]
    .replace(/&quot;/g, '"').replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
);

// What each pair is expected to share. The popup's card is width-capped by the
// viewport and its container carries the padding the mock's card carries
// itself, so the comparison names the field, not the element.
const CHECKS = [
  ["card width", data.mock.card.w, data.popup.card.w],
  ["card radius", data.mock.card.radius, data.popup.card.radius],
  ["card inset", data.mock.card.pad, data.popup.container.pad],
  ["heading size", data.mock.heading.size, data.popup.heading.size],
  ["heading weight", data.mock.heading.weight, data.popup.heading.weight],
  ["close box", data.mock.close.w, data.popup.close.w],
  ["entry height", data.mock.entry.h, data.popup.entry.h],
  ["entry radius", data.mock.entry.radius, data.popup.entry.radius],
  ["submit radius", data.mock.submit.radius, data.popup.submit.radius],
  ["submit size", data.mock.submit.size, data.popup.submit.size],
  ["dest icon box", data.mock.destIco.w, data.popup.destIco.w],
  ["dest shape", data.mock.destShape.w, data.popup.destShape.w],
];

let bad = 0;
for (const [name, a, b] of CHECKS) {
  const ok = String(a) === String(b);
  if (!ok) bad++;
  console.log(`${ok ? "✓" : "✗"} ${name.padEnd(16)} mock ${String(a).padEnd(10)} popup ${b}`);
}
console.log(bad ? `\n${bad} field(s) drifted` : "\nthe two cards agree");
