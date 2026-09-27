// panel-trash-item.test.js — a Trash row as drawn in Figma 43:34212: day group
// label, 40px icon tile, name, "Deleted by: <who> | Date: Mar 15", a days-left
// badge that Restore replaces on hover, and a red bin for delete.
//
//   node --test tests/panel-trash-item.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const dayjs = require("dayjs");

const DIR = path.join(__dirname, "..", "src/drumee/builtins/panel/trash/item");
const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = {
  Box: { X: node("Box.X"), Y: node("Box.Y") },
  Note: node("Note"),
  Image: { Svg: node("Image.Svg") },
  Button: { Svg: node("Button.Svg") },
};
const en = require("../locale/en.json");
global.LOCALE = new Proxy(en, { get: (t, k) => (k in t ? t[k] : k) });
String.prototype.format = function (...a) {
  return String(this).replace(/\{(\d+)\}/g, (_, i) => a[i]);
};
global.Dayjs = dayjs;
global._ = { escape: (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") };
global._a = {
  filename: "filename", ext: "ext", filetype: "filetype", modifier: "modifier",
  mtime: "mtime", folder: "folder", hub: "hub", mimetype: "mimetype",
  image: "image", video: "video", audio: "audio", note: "note", document: "document",
  web: "web", script: "script", stylesheet: "stylesheet",
};

const G = require(path.join(DIR, "group"));
const { fileIcon } = require(path.join(DIR, "file-icon"));
const skeleton = require(path.join(DIR, "skeleton"));

const P = "trash-item";
const at = (daysAgo, h = 12) => dayjs().startOf("day").subtract(daysAgo, "day").add(h, "hour").unix();
const item = (attrs) => ({ fig: { family: P }, mget: (k) => attrs[k] });
const walk = (n, out = []) => {
  if (Array.isArray(n)) { n.forEach((k) => walk(k, out)); return out; }
  if (!n || typeof n !== "object") return out;
  out.push(n);
  (n.kids || []).forEach((k) => walk(k, out));
  return out;
};
const has = (n, c) => String(n.className || "").split(/\s+/).includes(`${P}__${c}`);
const find = (t, c) => walk(t).find((n) => has(n, c));

test("day label: Today, Yesterday, then 'Aug 13', with the year once it differs", () => {
  const now = dayjs("2026-09-27T15:00:00");
  assert.equal(G.dayLabel(now.subtract(2, "hour").unix(), now), en.TODAY);
  assert.equal(G.dayLabel(now.subtract(1, "day").unix(), now), en.YESTERDAY);
  assert.equal(G.dayLabel(dayjs("2026-08-13T09:00:00").unix(), now), "Aug 13");
  assert.equal(G.dayLabel(dayjs("2025-12-31T09:00:00").unix(), now), "Dec 31, 2025");
  assert.equal(G.dayLabel(0, now), "");
});

test("the deletion time is trashed_time, upload time only for legacy rows", () => {
  assert.equal(G.trashedAt({ trashed_time: 50, mtime: 10 }), 50);
  assert.equal(G.trashedAt({ trashed_time: 0, mtime: 10 }), 10);
  assert.equal(G.trashedAt({ get: (k) => ({ trashed_time: 7 })[k] }), 7);
});

test("a group starts wherever the day changes from the row above, in on-screen order", () => {
  const row = (t) => ({ dataset: { day: G.dayKey(t) } });
  const els = [row(at(0, 10)), row(at(0, 9)), row(at(0, 8)), row(at(0, 7)), row(at(1)), row(at(3)), row(at(3, 8))];
  let asked;
  G.markDayGroups({ querySelectorAll: (sel) => { asked = sel; return els; } });
  assert.equal(asked, "[data-day]");
  assert.deepEqual(els.map((e) => e.dataset.group), ["start", "", "", "", "start", "start", ""]);
});

test("marking tolerates no list element yet", () => {
  assert.doesNotThrow(() => G.markDayGroups(null));
});

test("row: icon tile, name, deleted-by and date, badge, restore, delete", () => {
  const t = skeleton(item({
    filename: "Marketing_Assets_2023", filetype: "folder",
    modifier_name: "Alex Rivera", trashed_time: dayjs("2026-03-15T10:00:00").unix(),
    days_remaining: 30,
  }));
  assert.equal(find(t, "tile-ico").ico, "ph-folder");
  assert.equal(find(t, "name").content, "Marketing_Assets_2023");
  const who = find(t, "deleted-by").content;
  assert.match(who, /^Deleted by: <span class="trash-item__who">Alex Rivera<\/span>$/);
  assert.match(find(t, "date").content, /^Date: Mar 15(, 2026)?$/);
  assert.ok(find(t, "divider"));
  assert.equal(find(t, "days-badge").content, "30 days left");
  const restore = find(t, "restore");
  assert.equal(restore.service, "restore-to-desk");
  assert.equal(restore.content, en.RESTORE);
  const del = find(t, "delete");
  assert.equal(del.service, "delete-permanently");
  assert.equal(del.ico, "ph-trash");
});

test("the group label carries the row's day (shown only on a group's first row)", () => {
  const t = skeleton(item({ filename: "a", filetype: "document", ext: "pdf", trashed_time: at(0) }));
  assert.equal(find(t, "group").content, en.TODAY);
  assert.equal(find(t, "name").content, "a.pdf");
  assert.equal(find(t, "tile-ico").ico, "ph-file-pdf");
  assert.ok(has(find(t, "tile-ico"), "tile-ico--pdf"));
});

test("every file type gets its icon and tone (Figma file grid for the five it draws)", () => {
  const cases = [
    [{ filetype: "folder" }, "ph-folder", "folder"],
    [{ filetype: "hub" }, "ph-folder", "folder"],
    [{ filetype: "document", ext: "docx" }, "ph-file-text", "text"],
    [{ filetype: "document", ext: "TXT" }, "ph-file-text", "text"],
    [{ filetype: "document", ext: "pdf" }, "ph-file-pdf", "pdf"],
    [{ filetype: "document", ext: "xlsx" }, "ph-table", "sheet"],
    [{ filetype: "other", ext: "csv" }, "ph-table", "sheet"],
    [{ filetype: "document", ext: "pptx" }, "ph-presentation", "slides"],
    [{ filetype: "note" }, "ph-note-pencil", "note"],
    [{ filetype: "web", dataType: "drumee.note" }, "ph-note-pencil", "note"],
    [{ filetype: "image", ext: "png" }, "ph-image", "media"],
    [{ filetype: "video", ext: "mp4" }, "ph-file-video", "media"],
    [{ filetype: "video", mimetype: "audio" }, "ph-file-audio", "media"],
    [{ filetype: "audio", ext: "mp3" }, "ph-file-audio", "media"],
    [{ filetype: "zip", ext: "zip" }, "ph-file-zip", "other"],
    [{ filetype: "other", ext: "tar" }, "ph-file-zip", "other"],
    [{ filetype: "script", ext: "js" }, "ph-file-code", "other"],
    [{ filetype: "document", ext: "json" }, "ph-file-code", "other"],
    [{ filetype: "markdown", ext: "md" }, "ph-file-md", "text"],
    [{ filetype: "other", ext: "bin" }, "ph-file", "other"],
    [{}, "ph-file", "other"],
  ];
  for (const [m, ico, tone] of cases) {
    assert.deepEqual(fileIcon(m), { ico, tone }, JSON.stringify(m));
  }
});

test("names are escaped before they reach the markup", () => {
  const t = skeleton(item({ filename: "x", modifier_name: "<b>Eve</b> & co" }));
  assert.match(find(t, "deleted-by").content, /&lt;b&gt;Eve&lt;\/b&gt; &amp; co/);
});

test("a hub row gets the folder icon too; no name falls back to 'me'", () => {
  const t = skeleton(item({ filename: "WS", filetype: "hub" }));
  assert.equal(find(t, "tile-ico").ico, "ph-folder");
  assert.match(find(t, "deleted-by").content, />me</);
});

const sass = require("sass");
const SRC = path.join(__dirname, "..", "src/drumee");
const css = sass
  .compile(path.join(DIR, "skin/index.scss"), { loadPaths: [SRC, path.join(SRC, "skin")] })
  .css.replace(/\s+/g, " ");
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map(([, sel, body]) => ({ selectors: sel.split(",").map((x) => x.trim()), body }));
const declares = (selector, decl) =>
  rules.some((r) => r.selectors.includes(selector) && r.body.includes(decl));

test("the day label shows only on a group's first row", () => {
  assert.ok(declares('.trash-item__ui[data-group=start] .trash-item__group', "display: block"));
  // The hide must outrank ui-styles/container.css `.drumee-widget[data-flow=y]
  // { display: flex }` (0,2,0), which every Note root matches. A bare
  // `.trash-item__group` (0,1,0) lost to it on stage: every row showed its day.
  assert.ok(declares('.trash-item__ui:not([data-group=start]) .trash-item__group', "display: none"));
});

test("hover adds Restore and keeps the days-left badge", () => {
  assert.ok(declares(".trash-item__restore", "display: none"));
  assert.ok(declares(".trash-item__row:hover .trash-item__restore", "display: flex"));
  assert.doesNotMatch(css, /:hover[^{]*days-badge[^{]*\{[^}]*display: none/);
});

test("icon tones use the design's colour tokens", () => {
  const tones = {
    folder: "--primary-purple-40", text: "--primary-purple-30", pdf: "--secondary-blue-50",
    note: "--warning", sheet: "--success", slides: "--link-share",
    media: "--primary-purple-40", other: "--primary-purple-40",
  };
  for (const [tone, token] of Object.entries(tones)) {
    assert.ok(declares(`.trash-item__tile-ico--${tone}`, `color: var(${token})`), tone);
  }
});

test("a touch screen, which never hovers, still gets Restore", () => {
  assert.match(css, /@media \(hover: none\) \{[^@]*\.trash-item__restore \{ display: flex; \}/);
});

test("design colours come from the theme tokens", () => {
  assert.ok(declares(".trash-item__days-badge", "color: var(--signal-error)"));
  assert.ok(declares(".trash-item__restore", "color: var(--primary-purple-40)"));
  assert.ok(declares(".trash-item__delete", "color: var(--signal-error)"));
  assert.ok(declares(".trash-item__tile", "background-color: rgba(89, 80, 255, 0.1)"));
});

test("a row records its own day and asks the panel to regroup; it never decides the group", () => {
  const Module = require("node:module");
  const load = Module._load;
  Module._load = function (r, p, m) { return r === "./skin" ? {} : load.call(this, r, p, m); };
  global.LetcBox = class { feed() { } };
  const Item = require(path.join(DIR, "index.js"));
  Module._load = load;
  let asked = 0;
  const parent = { regroupSoon: () => { asked++; } };
  const w = Object.create(Item.prototype);
  const t = at(0, 10);
  Object.assign(w, {
    fig: { family: P },
    mget: (k) => (k === "logicalParent" ? parent : undefined),
    el: { dataset: {} },
    model: { get: (k) => ({ trashed_time: t })[k] },
  });
  w.onDomRefresh();
  assert.equal(w.el.dataset.day, G.dayKey(t));
  assert.equal(w.el.dataset.group, undefined);
  assert.equal(asked, 1);
  delete global.LetcBox;
});

test("never --primary-100: revamp.scss declares it twice and the lilac one wins", () => {
  const fs = require("node:fs");
  for (const f of ["item/skin/index.scss", "skin/index.scss"]) {
    const src = fs.readFileSync(path.join(DIR, "..", f), "utf8");
    assert.doesNotMatch(src, /var\(--primary-100\)/, f);
  }
  assert.ok(declares(".trash-item__name", "color: var(--primary-purple-100)"));
});

test("every icon the map can return is in the sprite", () => {
  const fs = require("node:fs");
  const sprite = fs.readFileSync(path.join(__dirname, "..", "icons/sprites/normalized.sprite.svg"), "utf8");
  const src = fs.readFileSync(path.join(DIR, "file-icon.js"), "utf8");
  const icons = [...new Set([...src.matchAll(/ico: "(ph-[a-z-]+)"/g)].map((m) => m[1]))];
  assert.ok(icons.length >= 13);
  for (const i of icons) assert.ok(sprite.includes(`id="--icon-${i}"`), i);
});
