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

// ── copy + folder chip, from the real getActivityMeta ──────────────────────
//
// LOCALE is a createSafeObject at runtime: a MISSING key returns the key's own
// name, which is truthy. That is why `LOCALE.X || 'fallback'` never falls back —
// the stub reproduces it so a missing key surfaces here instead of shipping a
// raw key name to users.
const enLocale = JSON.parse(readFileSync(join(ROOT, "locale/en.json"), "utf8"));
const LOCALE = new Proxy(enLocale, {
  get: (t, k) => (k in t ? t[k] : String(k)),
});

// "LOCALE"/"Visitor"/"_a"/"_"/"Dayjs" are harness parameters and are never
// assigned on global in this file — see harness-hygiene.test.js.
const meta = new Function(
  "LOCALE",
  "Visitor",
  "_a",
  "_",
  "Dayjs",
  `${skelSrc.slice(0, skelSrc.indexOf("module.exports"))}
   return getActivityMeta;`,
)(
  LOCALE,
  { id: "me" },
  new Proxy({}, { get: (_t, k) => String(k) }),
  require("lodash"),
  require("dayjs"),
);

// getActivityMeta only ever reads these off the widget.
const stub = (data) => ({
  getItemName: () => data.filename || data.name || "item",
  mget: (k) => data[k],
  isFolder: () => data.filetype === "folder",
  hasAttachment: () => !!data.attachment,
});
const metaFor = (data) => meta(stub(data), data);

test("a folder chat message no longer names the folder in its sentence", () => {
  const m = metaFor({
    category: "teamchat", filename: "checkin", folder_name: "checkin", cnt: "1",
  });
  assert.equal(m.before, "sent a message");
  assert.equal(m.label, "", "the folder must not be the label — it is the chip");
  assert.equal(m.folder, "checkin", "the folder goes to the chip instead");
  assert.ok(!/posted in/.test(m.before), "the old wording is gone");
});

test("a multi-message folder rollup keeps its count suffix", () => {
  const m = metaFor({ category: "teamchat", filename: "checkin", folder_name: "checkin", cnt: "3" });
  assert.equal(m.after, " (3)");
});

test("a meeting in a folder still names the folder in the sentence", () => {
  // Figma keeps "started a meeting in {Folder-name}" as one sentence, so this
  // branch must NOT be converted to the chip.
  for (const [action, key] of [["start", "STARTED_MEETING_ACTION"], ["end", "ENDED_MEETING_ACTION"]]) {
    const m = metaFor({
      category: "teamchat", meeting_action: action, filename: "checkin", folder_name: "checkin",
    });
    assert.equal(m.label, "checkin", "the folder stays in the sentence here");
    assert.equal(m.folder, undefined, "and must not also be a chip");
    assert.equal(m.before, enLocale[key]);
  }
});

test("an upload names the file, not \"file\", and puts the folder in the chip", () => {
  const m = metaFor({
    category: "media", event: "media.new", filename: "checkin",
    item_filename: "document", item_filetype: "document", folder_name: "checkin", cnt: "1",
  });
  assert.equal(m.before, "uploaded ", "Figma has no \"file\" between verb and name");
  assert.ok(!/uploaded file/.test(m.before));
  assert.equal(m.label, "document", "the file is the label");
  assert.equal(m.folder, "checkin", "the destination folder is the chip");
});

test("a new folder still says what was created", () => {
  const m = metaFor({
    category: "media", event: "media.new", filename: "Task", item_filetype: "folder", cnt: "1",
  });
  assert.equal(m.before, "created folder ");
  assert.equal(m.label, "Task");
});

test("the chip is suppressed when it would only repeat the label", () => {
  // A multi-file rollup labels the destination folder, so chip == label.
  const m = metaFor({
    category: "media", event: "media.new", filename: "checkin", folder_name: "checkin", cnt: "4",
  });
  assert.equal(m.label, "checkin");
  assert.equal(m.folder, m.label, "meta still carries it…");
  // …and the render guard drops it.
  assert.match(skelSrc, /const showFolder = !!folderName && folderName !== meta\.label;/);
});

test("a direct message has no folder chip", () => {
  const m = metaFor({ category: "chat", filename: "Duy Nguyen", cnt: "1" });
  assert.equal(m.folder, undefined, "a peer conversation has no folder context");
});

test("rows with no folder_name simply get no chip", () => {
  for (const data of [
    { category: "teamchat", filename: "checkin", cnt: "1" },
    { category: "media", event: "media.new", filename: "f", item_filename: "d", cnt: "1" },
  ]) {
    assert.equal(metaFor(data).folder, undefined);
  }
});

test("the share branch renders instead of throwing", () => {
  // This branch called ui.megt() — a method that does not exist — so every row
  // reaching it died with a TypeError and never rendered. It was unreachable in
  // practice (nothing emits media.share, and no media-category row carries
  // is_forward), which is why it went unnoticed. Now covered, so it stays fixed.
  const cases = [
    [{ category: "media", event: "media.share", filename: "budget.xlsx", filetype: "document" },
      "shared a ", "budget.xlsx", " with you", "link-share"],
    [{ category: "media", event: "media.share", filename: "x", filetype: "link" },
      "shared a ", "Shared Link", " with you", "link-share"],
    [{ category: "media", event: "media.share", filename: "x", accessibility: "restricted" },
      "shared a ", "Restricted Link", " with you", "restricted"],
    [{ category: "media", event: "media.new", is_forward: 1, filename: "y" },
      "shared a ", "y", " with you", "link-share"],
  ];
  for (const [data, before, label, after, colorClass] of cases) {
    let m;
    assert.doesNotThrow(() => { m = metaFor(data); }, `threw for ${JSON.stringify(data)}`);
    assert.equal(m.before, before);
    assert.equal(m.label, label);
    assert.equal(m.after, after);
    assert.equal(m.colorClass, colorClass);
    assert.equal(m.ico, "noti-share-network", "Figma: Tab=files, Action=File shared");
  }
  // Only the restricted variant is an error tone.
  assert.equal(metaFor(cases[2][0]).tone, "error");
  assert.equal(metaFor(cases[0][0]).tone, "brand");
});

test("the tab pills grow but never shrink", () => {
  // `flex: 1 0 auto` is load-bearing in BOTH directions and easy to "simplify"
  // into a regression:
  //   1 1 0    — an equal split leaves ~44px of label; "Meeting" needs ~49px, so
  //              it ellipsises as soon as it carries a count badge;
  //   1 1 auto — shrinking clips every label on the 360px mobile panel, where the
  //              six natural widths do not fit and the bar is meant to scroll.
  // Measured on the endpoint: 512px spans 16→16 untruncated, 360px scrolls with
  // nothing clipped.
  const panelSkin = readFileSync(join(ACT, "skin/index.scss"), "utf8");
  const tab = /&__tab \{[\s\S]*?\n  \}/.exec(panelSkin);
  assert.ok(tab, "the __tab rule moved");
  assert.match(tab[0], /flex:\s*1 0 auto;/, "pills must grow but not shrink");
  assert.ok(!/flex-shrink:\s*[1-9]/.test(tab[0]), "no shrink may be reintroduced");
  assert.match(panelSkin, /&__tabbar \{[\s\S]*?overflow-x:\s*auto;/,
    "the bar must still scroll when the pills genuinely do not fit");
});

test("every locale key the row uses resolves in every locale", () => {
  // A missing key renders its own NAME to the user (createSafeObject), not a
  // blank and not the `|| 'fallback'` — so a gap here is a visible bug.
  // No allowlist: the five en-only keys this used to tolerate were translated
  // on 2026-08-20, so every key the row renders must now exist in every locale.
  const used = [...new Set([...skelSrc.matchAll(/LOCALE\.([A-Z0-9_]+)/g)].map((m) => m[1]))];
  assert.ok(used.length > 5, "no locale keys found — did the file move?");
  const gaps = [];
  for (const lang of ["en", "fr", "es", "ru", "zh", "km"]) {
    const j = JSON.parse(readFileSync(join(ROOT, "locale", `${lang}.json`), "utf8"));
    for (const k of used) {
      if (!(k in j)) gaps.push(`${lang}.json missing ${k}`);
      else if (j[k] === k) gaps.push(`${lang}.json has ${k} set to its own key name`);
    }
  }
  assert.deepEqual(gaps, []);
});

test("the copy keys added for this change are in all six locales", () => {
  for (const lang of ["en", "fr", "es", "ru", "zh", "km"]) {
    const j = JSON.parse(readFileSync(join(ROOT, "locale", `${lang}.json`), "utf8"));
    for (const k of ["SENT_A_MESSAGE", "UPLOADED_ACTION"]) {
      assert.ok(j[k], `${lang}.json missing ${k}`);
      assert.notEqual(j[k], k, `${lang}.json ${k} must be copy, not the key name`);
    }
    assert.match(j.UPLOADED_ACTION, / $/, `${lang}: UPLOADED_ACTION precedes the file name`);
  }
});

test("routing and copy were not disturbed by the redesign", () => {
  // `megt` is not a method on anything, so these calls threw TypeError and took
  // the row's render down with them. Fixed 2026-08-20; the share branch is
  // exercised for real below.
  assert.ok(!/\bui\.megt\(/.test(skelSrc), "ui.megt is a typo for ui.mget");
  assert.ok(skelSrc.includes("service: textBlockService"));
  for (const s of ["toggle-favorite", "dismiss-activity", "join-meeting"]) {
    assert.ok(skelSrc.includes(`service: '${s}'`), `${s} wiring lost`);
  }
});
