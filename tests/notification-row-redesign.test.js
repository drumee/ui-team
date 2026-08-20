// Round 3 notification row redesign (Figma component set 58187:90482).
//
// Two of these checks exist because the failure mode is SILENT:
//
//   * a mistyped `ico` renders an empty 14x14 badge with no console error, so a
//     wrong glyph name ships looking like a design decision;
//   * an exception raised while grouping rows by day is swallowed whole —
//     ui-core's list calls renderData() inside `try { … } catch (error) {}` —
//     so the feed would render EMPTY with nothing logged anywhere.
//
// The day-grouping tests therefore execute the REAL _stampDayHeaders/_dayKey
// sliced out of the panel rather than a paraphrase of them.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const ACT = join(ROOT, "src/drumee/builtins/panel/activity");

const skelSrc = readFileSync(join(ACT, "widget/item/skeleton/index.js"), "utf8");
const skinSrc = readFileSync(join(ACT, "widget/item/skin/index.scss"), "utf8");
const panelSrc = readFileSync(join(ACT, "index.js"), "utf8");
const itemSrc = readFileSync(join(ACT, "widget/item/index.js"), "utf8");
const sprite = readFileSync(join(ROOT, "icons/sprites/normalized.sprite.svg"), "utf8");

const symbols = new Set([...sprite.matchAll(/id="--icon-([^"]+)"/g)].map((m) => m[1]));

test("the sprite parsed at all", () => {
  assert.ok(symbols.size > 400, `only ${symbols.size} symbols found`);
});

test("every badge / chip glyph resolves to a real sprite symbol", () => {
  // Match every 'noti-*' literal, NOT just `ico: 'x'`: several branches choose
  // the glyph with a ternary (`ico: created ? 'a' : 'b'`), which a key-anchored
  // regex skips — exactly where a typo would hide.
  const names = [...skelSrc.matchAll(/'(noti-[a-z0-9-]+)'/g)].map((m) => m[1]);
  assert.ok(names.length > 0, "no glyph literals found — did the file move?");
  const missing = [...new Set(names)].filter((n) => !symbols.has(n));
  assert.deepEqual(missing, [], "a missing glyph renders a blank badge, silently");
});

test("no `ico:` key holds a name that is not in the sprite", () => {
  const bad = [];
  for (const m of skelSrc.matchAll(/(?:ico|chipIco):\s*([^,\n]+)/g)) {
    for (const lit of m[1].matchAll(/'([^']+)'/g)) {
      if (!symbols.has(lit[1])) bad.push(`${lit[1]} in ${m[1].trim()}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("the trailing action glyphs still exist", () => {
  for (const n of ["notification_favorite", "notification_trash", "drumee-phone-cam"]) {
    assert.ok(symbols.has(n), `${n} missing`);
  }
});

test("every badge tone used has a [data-tone] rule, and none is orphaned", () => {
  // BADGE.<key> anywhere, ternaries included.
  const used = new Set([...skelSrc.matchAll(/BADGE\.([a-z]+)/g)].map((m) => m[1]));
  const styled = new Set([...skinSrc.matchAll(/\[data-tone="([a-z]+)"\]/g)].map((m) => m[1]));
  assert.ok(used.size >= 4, `expected all four tones to be exercised, got ${[...used]}`);
  for (const t of used) assert.ok(styled.has(t), `tone "${t}" has no css rule`);
  for (const t of styled) assert.ok(used.has(t), `css tone "${t}" is unused`);
});

test("the badge falls back to a tone and a glyph that both exist", () => {
  const tone = /dataset:\s*\{\s*tone:\s*meta\.tone\s*\|\|\s*BADGE\.([a-z]+)\s*\}/.exec(skelSrc);
  assert.ok(tone, "no tone fallback on the badge");
  assert.ok(skinSrc.includes(`[data-tone="${tone[1]}"]`), `fallback tone ${tone[1]} unstyled`);
  const ico = /ico:\s*meta\.ico\s*\|\|\s*'([^']+)'/.exec(skelSrc);
  assert.ok(ico, "no ico fallback on the badge");
  assert.ok(symbols.has(ico[1]), `fallback glyph ${ico[1]} missing`);
});

// ── day grouping, executed from the real panel source ──────────────────────
function slice(name) {
  const start = panelSrc.indexOf(`  ${name}(`);
  assert.ok(start > -1, `${name} not found in the panel source`);
  let depth = 0;
  for (let j = panelSrc.indexOf("{", start); j < panelSrc.length; j++) {
    if (panelSrc[j] === "{") depth++;
    else if (panelSrc[j] === "}" && --depth === 0) return panelSrc.slice(start, j + 1);
  }
  throw new Error(`unbalanced braces in ${name}`);
}

const dayjs = require("dayjs");
const lodash = require("lodash");
// `Dayjs`/`_` are harness parameters and are NOT assigned on global anywhere in
// this file — see harness-hygiene.test.js.
const Panel = new Function(
  "Dayjs",
  "_",
  `class Panel {
     constructor() { this._dayCursor = null; this.warns = []; }
     warn(...a) { this.warns.push(a); }
     ${slice("_stampDayHeaders")}
     ${slice("_dayKey")}
   }
   return Panel;`,
)(dayjs, lodash);

const DAY = 86400;
const now = Math.floor(Date.now() / 1000);
const yesterdayEvening = dayjs.unix(now).startOf("day").subtract(4, "hour").unix();
const old = now - 8 * DAY;

test("the first row of each day opens a group, the rest do not", () => {
  const p = new Panel();
  const rows = [
    { timestamp: now }, { timestamp: now - 60 },
    { timestamp: yesterdayEvening }, { timestamp: old },
  ];
  p._stampDayHeaders({ _curPage: 1 }, rows);
  assert.equal(rows[0].day_header, "today");
  assert.equal(rows[1].day_header, undefined, "same day must not repeat the caption");
  assert.equal(rows[2].day_header, "yesterday");
  assert.match(rows[3].day_header, /^\d{4}-\d{2}-\d{2}$/, "older days get a dated key");
  assert.deepEqual(p.warns, []);
});

test("a later page continues the open group instead of repeating its caption", () => {
  const p = new Panel();
  p._stampDayHeaders({ _curPage: 1 }, [{ timestamp: old }]);
  const page2 = [{ timestamp: old - 60 }, { timestamp: old - 9 * DAY }];
  p._stampDayHeaders({ _curPage: 2 }, page2);
  assert.equal(page2[0].day_header, undefined, "duplicate caption across a page boundary");
  assert.ok(page2[1].day_header, "a new day on page 2 still opens a group");
});

test("restarting at page 1 resets the cursor", () => {
  // restart() — tab switch, unread toggle, refresh — always refetches page 1.
  const p = new Panel();
  p._stampDayHeaders({ _curPage: 1 }, [{ timestamp: old }]);
  const again = [{ timestamp: old }];
  p._stampDayHeaders({ _curPage: 1 }, again);
  assert.match(
    again[0].day_header,
    /^\d{4}-\d{2}-\d{2}$/,
    "after a restart the first row must open its group again",
  );
});

test("malformed rows never throw and never leave a stale caption", () => {
  const p = new Panel();
  const junk = [null, undefined, {}, { timestamp: 0 }, { ctime: now }, { timestamp: "nope" }];
  p._stampDayHeaders({ _curPage: 1 }, junk);
  assert.deepEqual(p.warns, [], "grouping should not need its own error path here");
  assert.equal(junk[2].day_header, undefined);
  assert.equal(junk[3].day_header, undefined, "timestamp 0 is not a date");
  assert.equal(junk[4].day_header, "today", "ctime is the documented fallback");
  p._stampDayHeaders({ _curPage: 1 }, "not-an-array");
  p._stampDayHeaders(null, [{ timestamp: now }]);
});

test("a caption left over from an earlier pass is cleared", () => {
  const p = new Panel();
  const stale = [
    { timestamp: now, day_header: "yesterday" },
    { timestamp: now, day_header: "today" },
  ];
  p._stampDayHeaders({ _curPage: 1 }, stale);
  assert.equal(stale[0].day_header, "today");
  assert.equal(stale[1].day_header, undefined);
});

// ── unread state ───────────────────────────────────────────────────────────
test("is_read maps to the unread dataset, absent meaning unread", () => {
  assert.match(
    skelSrc,
    /const unread = parseInt\(data\.is_read, 10\) === 1 \? '0' : '1';/,
    "the unread rule changed — update this test deliberately",
  );
  const unreadOf = (v) => (parseInt(v, 10) === 1 ? "0" : "1");
  assert.equal(unreadOf(1), "0");
  assert.equal(unreadOf("1"), "0", "the driver can return strings");
  assert.equal(unreadOf(0), "1");
  assert.equal(unreadOf(undefined), "1", "panel-built actionable rows carry no is_read");
  assert.equal(unreadOf(null), "1");
});

test("the day-header locale keys exist in every locale", () => {
  for (const lang of ["en", "fr", "es", "ru", "zh", "km"]) {
    const j = JSON.parse(readFileSync(join(ROOT, "locale", `${lang}.json`), "utf8"));
    // A missing key renders blank with no error, so this is not cosmetic.
    assert.ok(j.TODAY, `${lang}.json is missing TODAY`);
    assert.ok(j.YESTERDAY, `${lang}.json is missing YESTERDAY`);
  }
});

test("the day caption can never navigate", () => {
  // It keeps its own click handler so stopPropagation contains the click, and
  // the service is swallowed by reading the CLICKED widget rather than the
  // resolved service (which prefers the row's own model service).
  assert.match(skelSrc, /service: 'day-header'/);
  assert.match(
    itemSrc,
    /if \(cmd && cmd\.get && cmd\.get\(_a\.service\) === 'day-header'\) return;/,
  );
});

test("routing and copy were not disturbed by the redesign", () => {
  assert.ok(
    skelSrc.includes("ui.megt(_a.accessibility)"),
    "the pre-existing ui.megt typo must stay until it is fixed deliberately — " +
      "fixing it changes visible copy",
  );
  assert.ok(skelSrc.includes("service: textBlockService"));
  for (const s of ["toggle-favorite", "dismiss-activity", "join-meeting"]) {
    assert.ok(skelSrc.includes(`service: '${s}'`), `${s} wiring lost`);
  }
});
