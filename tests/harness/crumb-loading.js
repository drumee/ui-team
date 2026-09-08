// Does the caret appear WITH the address, or ahead of it?
//
// THE REPORT, three times over: an all-but-empty chip showing only the
// switcher caret. `desk_breadcrumb` is a lazily import()ed kind (seeds.js:
// `() => e.e(345)`), so the chip mounts an empty ___letc_loader placeholder and
// respawns it when the chunk lands (ui-core kind/loader). The caret is a plain
// Skeletons.Menu and paints on the first frame.
//
// THREE FLAG-BASED FIXES FAILED, and this harness is built to catch the reason.
// Each keyed the caret on a stamp — `data-loading` on the breadcrumb root, then
// `data-address` on it, then `data-address` on the chip — and a stamp has to be
// written and cleared at the right moments by a widget that does not exist for
// the whole of its own chunk load, paints inside an `ensurePart` promise, has
// ~10 broadcast paths that can declare "no address", and hangs its answer on a
// chip that outlives it across a topbar re-feed. Any of those reveals the caret
// with no address behind it. A hand-written harness that always renders a
// complete breadcrumb cannot see any of it — which is why every one of those
// fixes passed its tests.
//
// So the skin has NO flag: the caret, the spinner and the crumbs are a function
// of whether the CRUMBS are present, asked with `:has()`. These four states set
// no attribute at all; they differ only in which crumb parts exist.
//
//   chunk loading   chip, no breadcrumb at all    spinner   caret hidden
//   resolving       + breadcrumb, empty track     spinner   caret hidden
//   partial         + crumb with glyph, no name   spinner   caret hidden
//   resolved        + glyph AND name              none      caret visible
//
// Run:  node tests/harness/crumb-loading.js
const { execFileSync } = require("node:child_process");
const { writeFileSync, mkdtempSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const ROOT = join(__dirname, "../..");
const CHROME = process.env.CHROME
  || ["chromium", "chromium-browser", "google-chrome"].find((c) => {
    try { execFileSync("which", [c], { stdio: "pipe" }); return true; } catch (e) { return false; }
  });
if (!CHROME) throw new Error("no chromium on PATH; set CHROME=");

const sass = (e) => execFileSync("sass", ["-I", ".", "-I", "skin", "--no-source-map", e],
  { cwd: join(ROOT, "src/drumee"), encoding: "utf8", maxBuffer: 1 << 26 });

// The chunk-loading state is measured with topbar.scss ALONE, because that is
// genuinely all that is loaded then: breadcrumb/skin is `require`d inside the
// chunk that has not arrived.
const TOPBAR = sass("modules/desk/skin/topbar.scss");
const BASE = ["skin/vars/revamp.scss", "router/skin/themes/light.scss",
  "skin/lib/container.scss"].map(sass).join("");
const CRUMB = sass("modules/desk/breadcrumb/skin/index.scss")
  + sass("modules/desk/breadcrumb/item/skin/index.scss");

// The breadcrumb widget and its track, as breadcrumb/skeleton + item/skeleton
// emit them. `parts` says which crumb pieces exist, which is the ONLY thing
// the skin now keys on — there is no attribute to set.
const breadcrumb = (id, parts) => `
    <div id="${id}-bc" class="desk-module-topbar__breadcrumb desk-breadcrumb desk-breadcrumb__ui" data-section="0">
      <div id="${id}-track" class="box desk-breadcrumb__main" data-flow="x">
        ${parts.length ? `
        <div class="breadcrumb-item breadcrumb-item__ui">
          <div class="box breadcrumb-item__main" data-flow="x" data-current="1">
            <div class="box breadcrumb-item__tab" data-flow="x">
              ${parts.includes("icon") ? `<div id="${id}-icon" class="breadcrumb-item__icon private"><svg width="20" height="20"></svg></div>` : ""}
              ${parts.includes("name") ? `<div id="${id}-name" class="breadcrumb-item__filename"><div class="inner note-content">test restricted</div></div>` : ""}
            </div>
          </div>
        </div>` : ""}
      </div>
    </div>`;

// The chip as desk/skeleton/topbar.js authors it, inside __left-cluster.
// `box` alongside data-flow, because that pair is what ui-core stamps and the
// flex rules key on the class, not the attribute.
const chip = (id, { widget = true, parts = [] } = {}) => `
<div class="box desk-module-topbar__left-cluster" data-flow="x">
  <div id="${id}" class="box desk-module-topbar__crumb-group" data-flow="x">
    ${widget ? breadcrumb(id, parts) : ""}
    <div class="menu desk-module-topbar__ws-wrapper" data-flow="y">
      <div class="box menu-topic-trigger menu-trigger" data-flow="x">
        <div id="${id}-caret" class="desk-module-topbar__ws-btn"><svg width="16" height="16"></svg></div>
      </div>
    </div>
    <div class="box desk-module-topbar__ws-rename" data-flow="x"></div>
  </div>
</div>`;

const PROBE = `
  const el = (id) => document.getElementById(id);
  const cs = (id, pseudo) => getComputedStyle(el(id), pseudo || null);
  const w = (id) => Math.round(el(id).getBoundingClientRect().width);
  const read = (id) => ({
    spinW: cs(id, '::after').width,
    spinAnim: cs(id, '::after').animationName,
    spinContent: cs(id, '::after').content,
    caretVis: cs(id + '-caret').visibility,
    caretBox: w(id + '-caret'),
    // A descendant of a display:none parent still computes its OWN display, so
    // the only honest read of "is it on screen" is the rendered box.
    iconW: el(id + '-icon') ? w(id + '-icon') : 0,
    nameW: el(id + '-name') ? w(id + '-name') : 0,
    trackW: el(id + '-track') ? w(id + '-track') : 0,
    chipW: w(id),
  });`;

function measure(css, markup, probe) {
  const page = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0}${css}</style>
<div class="desk-module desk-module-topbar" style="width:900px">${markup}</div>
<script>${PROBE}
  document.title = JSON.stringify(${probe});
</script>`;
  const dir = mkdtempSync(join(tmpdir(), "crumb-"));
  const f = join(dir, "c.html");
  writeFileSync(f, page);
  const dom = execFileSync(CHROME, ["--headless", "--disable-gpu", "--no-sandbox",
    "--virtual-time-budget=1200", "--window-size=900,240", "--dump-dom", "file://" + f],
    { encoding: "utf8", maxBuffer: 1 << 26 });
  return JSON.parse(dom.match(/<title>([\s\S]*?)<\/title>/)[1]
    .replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
}

// THE WORST CASE: no breadcrumb element in the chip at all, and only the skin
// that ships outside the lazy chunk.
const chunk = measure(BASE + TOPBAR, chip("chunk", { widget: false }),
  "{ chunk: read('chunk') }").chunk;

// The post-respawn states, with every skin loaded as the page then has it.
// `part` is a crumb with its glyph but no name yet — a half-drawn address,
// which must read as waiting rather than as an address.
const m = measure(BASE + CRUMB + TOPBAR,
  chip("busy") + chip("part", { parts: ["icon"] })
    + chip("done", { parts: ["icon", "name"] }),
  "{ busy: read('busy'), part: read('part'), done: read('done') }");
const { busy, part, done } = m;

const checks = [
  // ── The report: no breadcrumb in the chip at all ────────────────────────
  ["CHUNK LOADING: the caret is hidden", chunk.caretVis === "hidden"],
  ["CHUNK LOADING: the spinner is drawn on the chip", chunk.spinW === "14px"],
  ["CHUNK LOADING: the spinner is animated", chunk.spinAnim === "crumb-loading-spin"],

  // ── Breadcrumb up, track still empty ────────────────────────────────────
  ["RESOLVING: the caret is hidden", busy.caretVis === "hidden"],
  ["RESOLVING: the spinner is drawn", busy.spinW === "14px"],

  // ── A HALF-drawn crumb is not an address ────────────────────────────────
  ["PARTIAL: a glyph with no name keeps the caret hidden", part.caretVis === "hidden"],
  ["PARTIAL: the spinner still runs", part.spinW === "14px"],
  ["PARTIAL: the half-drawn track is not shown", part.trackW === 0],

  // ── Resolved ────────────────────────────────────────────────────────────
  ["RESOLVED: no spinner", done.spinContent === "normal" || done.spinContent === "none"],
  ["RESOLVED: the icon is shown", done.iconW > 0],
  ["RESOLVED: the filename is shown", done.nameW > 0],
  ["RESOLVED: the caret is shown", done.caretVis === "visible"],

  // ── What the report asked for ───────────────────────────────────────────
  //
  // The caret's visibility is now a FUNCTION of the crumbs, with no state in
  // between, so it cannot lead them in any of the states above.
  ["the caret NEVER shows without a complete address",
    chunk.caretVis === "hidden" && busy.caretVis === "hidden"
      && part.caretVis === "hidden" && done.caretVis === "visible"],
  // The waiting states must be INDISTINGUISHABLE, or the chunk landing (or a
  // half-drawn crumb) is itself a visible flicker before the address arrives.
  ["every waiting state looks identical",
    chunk.caretVis === busy.caretVis && busy.caretVis === part.caretVis
      && chunk.spinW === busy.spinW && busy.spinW === part.spinW
      && chunk.chipW === busy.chipW && busy.chipW === part.chipW],
  // visibility, not display: the caret must keep the exact box it has once
  // resolved, or the address shifts sideways at the moment it lands.
  ["the caret keeps its box throughout",
    chunk.caretBox > 0 && chunk.caretBox === done.caretBox && busy.caretBox === done.caretBox],
  ["the chip holds spinner + caret + inset while waiting",
    busy.chipW > 40 && busy.chipW < done.chipW && chunk.chipW > 40],
];

let bad = 0;
for (const [label, ok] of checks) {
  if (!ok) bad += 1;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
}
console.log("\nchunk:    ", JSON.stringify(chunk));
console.log("resolving:", JSON.stringify(busy));
console.log("partial:  ", JSON.stringify(part));
console.log("resolved: ", JSON.stringify(done));
if (bad) {
  console.error(`\n${bad} check(s) failed`);
  process.exit(1);
}
