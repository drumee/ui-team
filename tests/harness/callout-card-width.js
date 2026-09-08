// Do the two callout shapes measure the same, whatever they say?
//
// A tour alternates BARE screens (a `text:` entry — one bold line) with
// standard ones (`title:` + `desc:`). The bare shape used to hug its content
// (`width: max-content`, capped at `min(420px, 60vw)`), so the card resized as
// the user pressed Next and the eye had to find it again each time. Measured
// before that was fixed: 115px on a short line, 420px on a long one, against
// the standard card's fixed 297.
//
// The narrow tier was always uniform — its rule pins a width on the shared
// class — which is exactly why this has to be measured at more than one tier.
//
// Run:  node tests/harness/callout-card-width.js
const { execFileSync } = require("node:child_process");
const { writeFileSync, mkdtempSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const ROOT = require("node:path").join(__dirname, "../..");
const CHROME = process.env.CHROME
  || ["chromium","chromium-browser","google-chrome"].find((c) => {
    try { execFileSync("which", [c], { stdio: "pipe" }); return true; } catch (e) { return false; }
  });
if (!CHROME) throw new Error("no chromium on PATH; set CHROME=");
const sass = (e) => execFileSync("sass", ["-I",".","-I","skin","--no-source-map",e],
  { cwd: join(ROOT,"src/drumee"), encoding:"utf8", maxBuffer: 1<<26 });
let css = "";
for (const e of ["skin/vars/revamp.scss","router/skin/themes/light.scss",
                 "skin/lib/container.scss","modules/desk/tutorial/skin/index.scss"]) css += sass(e);

// The two shapes tooltip.js emits, with the workspace tour's own copy — a very
// short bare line and a very long one, which is where a hug shows.
const card = (id, bare, body) => `
  <div id="${id}" class="box tutorial__bubble-card${bare ? " tutorial__bubble-card--bare" : ""}"
       data-flow="y" data-direction="north" data-beak="center"
       style="position:relative!important;left:auto!important;top:auto!important;transform:none!important">
    ${body}
  </div>`;
const bare = (t) => card(`bare-${t.length}`, true,
  `<div class="tutorial__bubble-text">${t}</div>`);
const std = (t) => card(`std-${t.length}`, false,
  `<div class="tutorial__bubble-title">Internal workspace</div><div class="tutorial__bubble-desc">${t}</div>`);

const SHORT = "Name it";
const LONG = "Now create your first workspace and invite the people you work with every day";

for (const [w, h, tier] of [[1440, 900, "wide"], [900, 900, "narrow"]]) {
  const page = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0}${css}</style>
<div class="tutorial tutorial__ui tutorial-main" data-size="${tier}" data-short="0" data-tour="workspace"
     style="width:${w}px;height:${h}px">
  ${bare(SHORT)}${bare(LONG)}${std(SHORT)}${std(LONG)}
</div>
<script>
  const w = (id) => Math.round(document.getElementById(id).getBoundingClientRect().width);
  document.title = JSON.stringify({
    bareShort: w('bare-${SHORT.length}'), bareLong: w('bare-${LONG.length}'),
    stdShort:  w('std-${SHORT.length}'),  stdLong:  w('std-${LONG.length}'),
  });
</script>`;
  const dir = mkdtempSync(join(tmpdir(),"card-")); const f = join(dir,"c.html");
  writeFileSync(f, page);
  const dom = execFileSync(CHROME, ["--headless","--disable-gpu","--no-sandbox",
    "--virtual-time-budget=1200",`--window-size=${w},${h}`,"--dump-dom","file://"+f],
    { encoding:"utf8", maxBuffer: 1<<26 });
  const d = JSON.parse(dom.match(/<title>([\s\S]*?)<\/title>/)[1]
    .replace(/&quot;/g,'"').replace(/&amp;/g,"&"));
  const all = Object.values(d);
  const same = all.every((v) => v === all[0]);
  console.log(`${same ? "✓" : "✗"} ${tier.padEnd(7)} bare ${d.bareShort}/${d.bareLong}  standard ${d.stdShort}/${d.stdLong}`);
}
