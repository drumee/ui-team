// Where does the migrate callout land on the three import-dialog screens?
//
// 176:47527 states the placement as two numbers: the dialog's right edge at
// x1056 and the callout's left edge at x1090 — the card stands 34px clear of
// the PANEL. The screens anchored on the row they were about instead, and
// every row stops 28px short of the panel edge (the dialog's inset), so a 32px
// gap from the row put the card 4px off the panel: all but touching it.
//
// This needs a layout engine rather than a unit test, because the thing in
// question is where the real skeleton's boxes actually come to rest — the row
// inset is a consequence of the dialog's padding, which no fixture would show.
//
// Run:  node tests/harness/migrate-callout-placement.js
//
// Each screen prints the panel edge, each row's edge, and the two candidate
// card positions. Expect: rows uniformly inset, and the panel-anchored card
// 34px clear.
const { execFileSync } = require("node:child_process");
const { writeFileSync, mkdtempSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const { renderModule, toHtml } = require("../helpers/render-skeleton.js");
const { anchorFor } = require("../../src/drumee/modules/desk/tutorial/host-kit.js");

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

function sass(entry) {
  return execFileSync(
    "sass",
    ["-I", ".", "-I", "skin", "--no-source-map", entry],
    { cwd: join(ROOT, "src/drumee"), encoding: "utf8", maxBuffer: 1 << 26 },
  );
}
// The dialog's own metrics come from the migrate skin; the rest set up the
// host it is measured inside. Compiling less than this has given false
// readings before — a missing file is a missing rule, not a smaller number.
let css = "";
for (const entry of [
  "modules/desk/tutorial/skin/index.scss",
  "modules/desk/tutorial/migrate/skin/index.scss",
  "modules/desk/tutorial/spotlight/skin/index.scss",
  "builtins/window/tutorial/skin/index.scss",
]) {
  css += sass(entry);
}

const ui = { fig: { family: "tutorial-migrate", group: "tutorial" }, mget: () => null };
// The SCREENS entries the tour raises, as ./skeleton/index.js reads them.
const SCREENS = [
  ["copy", { dialog: true }],
  ["paste", { dialog: true, copied: true }],
  ["verify", { dialog: true, copied: true, linked: true }],
];
// The parts a screen anchors on, in screen order, by the class they wear —
// toHtml keeps className and drops sys_pn.
const ROWS = ["step", "step", "submit"];

const dir = mkdtempSync(join(tmpdir(), "mg-place-"));
const W = 1368;
const H = 860;

for (const [key, screen] of SCREENS) {
  const html = toHtml(
    renderModule("src/drumee/modules/desk/tutorial/migrate/skeleton/index.js", ui, screen, {}),
  );
  const page = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0}${css}</style>
<div class="tutorial tutorial__ui tutorial-main window-tutorial window-tutorial__ui"
     data-size="wide" data-short="0" data-tour="migrate"
     style="position:relative;width:${W}px;height:${H}px;overflow:hidden">
  <div class="tutorial-main__content" style="width:100%;height:100%">${html}</div>
</div>
<script>
  const r = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { left: b.left, right: b.right, top: b.top, bottom: b.bottom,
             width: b.width, height: b.height };
  };
  const pick = (cls, nth) =>
    r(document.querySelectorAll('.tutorial-migrate__' + cls)[nth]);
  document.title = JSON.stringify({
    dialog: r(document.querySelector('.tutorial-migrate__dialog')),
    rows: [pick('step', 0), pick('step', 1), pick('submit', 0)],
  });
</script>`;
  const file = join(dir, `${key}.html`);
  writeFileSync(file, page);
  const dom = execFileSync(
    CHROME,
    ["--headless", "--disable-gpu", "--no-sandbox", "--virtual-time-budget=1500",
     `--window-size=${W},${H}`, "--dump-dom", `file://${file}`],
    { encoding: "utf8", maxBuffer: 1 << 26 },
  );
  const data = JSON.parse(
    dom.match(/<title>([\s\S]*?)<\/title>/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"),
  );
  const host = { left: 0, top: 0, right: W, bottom: H };
  const d = data.dialog;
  if (!d) throw new Error(`${key}: no dialog drawn`);

  console.log(`\n── ${key} — dialog ${Math.round(d.width)}w, right edge x${Math.round(d.right)}`);
  data.rows.forEach((row, i) => {
    if (!row) return;
    console.log(
      `   ${ROWS[i]} ${i}: right x${Math.round(row.right)}` +
      ` — ${Math.round(d.right - row.right)}px inside the panel;` +
      ` row-anchored card left ${anchorFor(row, "west", 32, host).left}`,
    );
  });
  console.log(`   panel-anchored card left ${anchorFor(d, "west", 34, host).left} — the design's 34px`);
}
