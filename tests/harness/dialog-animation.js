// Do both import cards actually animate — and does reduced motion actually
// switch them off?
//
// The second half is the one worth a browser. `@media (prefers-reduced-motion)`
// adds NO specificity, so a cancel block written above the rules it cancels is
// simply outranked by them and the setting has no effect whatsoever — silently,
// with the CSS looking correct in the file. Both of these files had that bug,
// and so did the folder window's create dialog, which is where the pattern was
// copied from.
//
// Run:  node tests/harness/dialog-animation.js
const { execFileSync } = require("node:child_process");
const { writeFileSync, mkdtempSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

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
  "modules/desk/tutorial/migrate/skin/index.scss",
  "builtins/widget/migrate-gdrive-popup/skin/index.scss",
  "builtins/window/folder/skin/index.scss",
]) {
  css += sass(entry);
}

// One of each card in each state. The popup's mobile card is included because
// its rules carry an extra attribute selector and so outrank the cancel block
// on specificity — being last in the file does not save it.
const CASES = [
  ["mock, arriving", '<div class="tutorial-migrate__dialog" data-enter="1"></div>', "tutorial-migrate-dialog-in"],
  ["mock, leaving", '<div class="tutorial-migrate__dialog" data-closing="1"></div>', "tutorial-migrate-dialog-out"],
  ["popup, arriving", '<div class="migrate-gdrive-popup__ui"></div>', "migrate-gdrive-in"],
  ["popup, leaving", '<div class="migrate-gdrive-popup__ui" data-closing="1"></div>', "migrate-gdrive-out"],
  ["popup mobile, arriving", '<div class="migrate-gdrive-popup__ui" data-device="mobile"></div>', "migrate-gdrive-in-mobile"],
  ["popup mobile, leaving", '<div class="migrate-gdrive-popup__ui" data-device="mobile" data-closing="1"></div>', "migrate-gdrive-out-mobile"],
  ["create folder, arriving", '<div class="window-folder__create-folder-dialog"></div>', "window-folder-dialog-in"],
  ["create folder, leaving", '<div class="window-folder__create-folder-dialog" data-closing="1"></div>', "window-folder-dialog-out"],
];

function measure(reduced) {
  const page = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0}${css}</style>
${CASES.map(([, html], i) => html.replace("<div ", `<div id="c${i}" `)).join("\n")}
<script>
  document.title = JSON.stringify(
    ${JSON.stringify(CASES.map((_, i) => i))}.map(
      (i) => getComputedStyle(document.getElementById('c' + i)).animationName,
    ),
  );
</script>`;
  const dir = mkdtempSync(join(tmpdir(), "dlg-anim-"));
  const file = join(dir, "a.html");
  writeFileSync(file, page);
  const args = ["--headless", "--disable-gpu", "--no-sandbox",
    "--virtual-time-budget=1200", "--window-size=1200,900", "--dump-dom"];
  if (reduced) args.push("--force-prefers-reduced-motion");
  const dom = execFileSync(CHROME, [...args, `file://${file}`],
    { encoding: "utf8", maxBuffer: 1 << 26 });
  return JSON.parse(
    dom.match(/<title>([\s\S]*?)<\/title>/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"),
  );
}

const normal = measure(false);
const reduced = measure(true);

let bad = 0;
CASES.forEach(([name, , want], i) => {
  const okNormal = normal[i] === want;
  const okReduced = reduced[i] === "none";
  if (!okNormal || !okReduced) bad++;
  console.log(
    `${okNormal && okReduced ? "✓" : "✗"} ${name.padEnd(24)}` +
    ` plays ${String(normal[i]).padEnd(28)} reduced ${reduced[i]}`,
  );
});
console.log(bad ? `\n${bad} case(s) wrong` : "\nboth halves play, and reduced motion cancels every one");
