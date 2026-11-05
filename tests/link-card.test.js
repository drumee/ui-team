// Link cards for Drumee links in chat (Lexis 2026-11-04): what a card may
// show, which links get one, escaping, and the wiring in chat + chat-item.
//
//   node --test tests/link-card.test.js
const test = require("node:test");
const assert = require("node:assert");
const Module = require("node:module");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const ROOT = resolve(__dirname, "..");
const read = (f) => readFileSync(resolve(ROOT, f), "utf8");
const LC = require("../src/drumee/libs/drumee-link-card");

const realLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === "libs/drumee-link-card") return LC;
  return realLoad.call(this, request, ...rest);
};
const tpl = require("../src/drumee/builtins/widget/chat-item/template/link-card");
Module._load = realLoad;

const ENV = { mainDomain: "app.drumee.com", currentHost: "app.drumee.com" };
const TOKEN = "lUIljceM1Z2uDJ0NBl1mw";
const LANGS = ["en", "fr", "es", "ru", "zh", "km"];

// ── which links ──────────────────────────────────────────────────────────────

test("Internal links: compact and long form, filetype from the URL only", () => {
  const c = LC.parseDrumeeLink("https://app.drumee.com/-/#/desk/wm/o/12345/ad43ec7aad43ec80/document", ENV);
  assert.deepStrictEqual(c, {
    kind: "internal",
    filetype: "document",
    url: "https://app.drumee.com/-/#/desk/wm/o/12345/ad43ec7aad43ec80/document",
  });
  const l = LC.parseDrumeeLink(
    "https://app.drumee.com/-/preview/#/desk/wm/open/nid=1&hub_id=ad43&kind=media&filetype=image",
    ENV
  );
  assert.strictEqual(l.kind, "internal");
  assert.strictEqual(l.filetype, "image");
});

test("External links: short /s/<token> and historic #/dmz/share/<token>", () => {
  for (const u of [
    `https://share.app.drumee.com/-/s/${TOKEN}`,
    `https://share.app.drumee.com/-/preview/s/${TOKEN}`,
    `https://share.app.drumee.com/-/#/dmz/share/${TOKEN}`,
    `https://share.app.drumee.com/-/preview/#/dmz/share/${TOKEN}`,
  ]) {
    const r = LC.parseDrumeeLink(u, ENV);
    assert.ok(r, u);
    assert.strictEqual(r.kind, "share", u);
    assert.strictEqual(r.token, TOKEN, u);
  }
});

test("Internal link of an external workspace: ?ext=1 before the #, pink card", () => {
  const base = "https://app.drumee.com/-/#/desk/wm/o/12345/ad43ec7aad43ec80/document";
  const marked = LC.markExternal(base);
  assert.strictEqual(marked, "https://app.drumee.com/-/?ext=1#/desk/wm/o/12345/ad43ec7aad43ec80/document");
  assert.strictEqual(marked.length - base.length, 6);
  assert.strictEqual(LC.markExternal(marked), marked, "idempotent");
  assert.strictEqual(LC.markExternal("https://h/-/?r=1#/x"), "https://h/-/?r=1&ext=1#/x");
  assert.strictEqual(LC.markExternal("https://h/-/"), "https://h/-/", "no hash: unchanged");
  assert.strictEqual(LC.markExternal(undefined), undefined);

  const ext = LC.parseDrumeeLink(marked, ENV);
  assert.deepStrictEqual([ext.kind, ext.filetype, ext.external], ["internal", "document", true]);
  assert.strictEqual(LC.cardModel(ext, null, {}).tone, "internal-share");
  const long = LC.parseDrumeeLink(LC.markExternal("https://app.drumee.com/-/#/desk/wm/open/nid=1&hub_id=ad43&kind=media&filetype=image"), ENV);
  assert.strictEqual(LC.cardModel(long, null, {}).tone, "internal-share");
  // unmarked and wrongly-marked links stay the internal (orange) card
  assert.strictEqual(LC.cardModel(LC.parseDrumeeLink(base, ENV), null, {}).tone, "internal");
  assert.strictEqual(LC.parseDrumeeLink("https://app.drumee.com/-/?ext=0#/desk/wm/o/1/ad43/folder", ENV).external, undefined);
  // the marker never turns a share link or a foreign link into anything else
  assert.strictEqual(LC.parseDrumeeLink(`https://evil.com/-/?ext=1#/desk/wm/o/1/ad43/folder`, ENV), null);

  const src = read("src/drumee/builtins/media/interact.js");
  assert.match(src, /if \(this\.mget\(_a\.area\) === _a\.share\) \{\s*url = require\("libs\/drumee-link-card"\)\.markExternal\(url\);/);
  const scss = read("src/drumee/skin/mixins/link-card.scss");
  assert.match(scss, /&\[data-tone="internal-share"\],\s*&\[data-tone="secure"\]/);
});

test("not ours → no card", () => {
  for (const u of [
    `https://evil.com/-/s/${TOKEN}`,
    `https://app.drumee.com.evil.com/-/s/${TOKEN}`,
    `https://notapp.drumee.com.evil/-/#/dmz/share/${TOKEN}`,
    "https://app.drumee.com/-/",
    "https://app.drumee.com/-/#/desk",
    "https://app.drumee.com/somewhere/s/abcdefghijk",
    `https://share.app.drumee.com/-/s/bad<token>`,
    "https://share.app.drumee.com/-/#/dmz/abcdefghijk", // old sharebox link: out of scope
    "https://share.app.drumee.com/-/#/dmz/meeting",
    "javascript:alert(1)",
    "not a url",
  ]) {
    assert.strictEqual(LC.parseDrumeeLink(u, ENV), null, u);
  }
});

test("composer: first Drumee link in free text, trailing punctuation ignored", () => {
  const r = LC.firstDrumeeLink(
    `see https://google.com and https://share.app.drumee.com/-/s/${TOKEN}. thanks`,
    ENV
  );
  assert.strictEqual(r.token, TOKEN);
  assert.strictEqual(LC.firstDrumeeLink("no link here", ENV), null);
  assert.strictEqual(LC.firstDrumeeLink("", ENV), null);
});

// ── what a card may show ─────────────────────────────────────────────────────

test("internal card is neutral: no name, ever", () => {
  const link = LC.parseDrumeeLink("https://app.drumee.com/-/#/desk/wm/o/1/ad43/document", ENV);
  const m = LC.cardModel(link, { state: "public", filename: "SECRET.pdf", sender: "X" }, {});
  assert.strictEqual(m.tone, "internal");
  assert.ok(!JSON.stringify(m).includes("SECRET"));
  assert.ok(m.badge);
});

test("external: loading → public (name + sender) / secure (neutral) / unavailable", () => {
  const link = LC.parseDrumeeLink(`https://share.app.drumee.com/-/s/${TOKEN}`, ENV);
  assert.strictEqual(LC.cardModel(link, null, {}).tone, "loading");
  const pub = LC.cardModel(link, { state: "public", filename: "Q4.pdf", filetype: "document", sender: "Lexis" }, {});
  assert.deepStrictEqual([pub.tone, pub.title, pub.desc], ["public", "Q4.pdf", "File shared by Lexis"]);
  const folder = LC.cardModel(link, { state: "public", filename: "Docs", filetype: "folder", sender: "Lexis" }, {});
  assert.strictEqual(folder.desc, "Folder shared by Lexis");
  assert.strictEqual(folder.icon, LC.ICON.folder);
  const sec = LC.cardModel(link, { state: "secure" }, {});
  assert.strictEqual(sec.tone, "secure");
  assert.ok(sec.badge);
  assert.strictEqual(LC.cardModel(link, { state: "unavailable" }, {}).tone, "unavailable");
  assert.strictEqual(LC.cardModel(link, { state: "weird" }, {}).tone, "unavailable");
});

test("public folder: first entry names follow the sender line", () => {
  const link = LC.parseDrumeeLink(`https://share.app.drumee.com/-/s/${TOKEN}`, ENV);
  const m = LC.cardModel(link, { state: "public", filename: "abc", filetype: "folder", sender: "Duy", items: ["a.pdf", "b", "c.png"], more: true }, {});
  assert.strictEqual(m.desc, "Folder shared by Duy · a.pdf, b, c.png, …");
  const n = LC.cardModel(link, { state: "public", filename: "abc", filetype: "folder", sender: "Duy", items: "x" }, {});
  assert.strictEqual(n.desc, "Folder shared by Duy");
});

test("tones follow the workspace area colours: Internal orange, External pink", () => {
  const scss = read("src/drumee/skin/mixins/link-card.scss");
  assert.match(scss, /--lc-accent: var\(--area-private\);/);
  assert.match(scss, /&\[data-tone="secure"\],\s*&\[data-tone="public"\] \{\s*--lc-accent: var\(--area-share\);/);
  assert.ok(!scss.includes("--orange-"), "no orange for External");
});

test("LOCALE strings are used when present", () => {
  const link = LC.parseDrumeeLink(`https://share.app.drumee.com/-/s/${TOKEN}`, ENV);
  const L = { LINK_CARD_FILE_BY: "Fichier partagé par {0}", LINK_CARD_EXTERNAL: "Lien externe" };
  const m = LC.cardModel(link, { state: "public", filename: "a", sender: "B" }, L);
  assert.strictEqual(m.desc, "Fichier partagé par B");
  assert.strictEqual(m.label, "Lien externe");
});

test("every LINK_CARD_* key exists in all 6 locales", () => {
  const en = JSON.parse(read("locale/en.json"));
  const keys = Object.keys(en).filter((k) => k.startsWith("LINK_CARD_"));
  assert.strictEqual(keys.length, 14);
  for (const lang of LANGS) {
    const l = JSON.parse(read(`locale/${lang}.json`));
    for (const k of keys) assert.ok(l[k], `${lang} ${k}`);
    assert.ok(l.LINK_CARD_FILE_BY.includes("{0}"), lang);
  }
});

// ── facts cache ──────────────────────────────────────────────────────────────

test("one request per token; failures are not cached", async () => {
  const cache = new Map();
  let calls = 0;
  const ask = async () => { calls++; return { state: "secure" }; };
  const [a, b] = await Promise.all([
    LC.cachedFacts(cache, TOKEN, ask, 1000),
    LC.cachedFacts(cache, TOKEN, ask, 1001),
  ]);
  assert.deepStrictEqual([a, b, calls], [{ state: "secure" }, { state: "secure" }, 1]);
  await LC.cachedFacts(cache, TOKEN, ask, 1000 + 61000);
  assert.strictEqual(calls, 2, "expired after a minute");

  const c2 = new Map();
  const fail = async () => { throw new Error("net"); };
  assert.strictEqual(await LC.cachedFacts(c2, TOKEN, fail), null);
  assert.strictEqual(c2.size, 0);
  assert.deepStrictEqual(await LC.cachedFacts(new Map(), TOKEN, async () => [{ state: "public" }]), { state: "public" });
  assert.deepStrictEqual(await LC.cachedFacts(new Map(), TOKEN, async () => ({})), { state: "unavailable" });
});

// ── markup ───────────────────────────────────────────────────────────────────

test("sent-message card escapes every text and the href", () => {
  const html = tpl(
    { tone: "public", label: "External link", title: '<img src=x onerror=alert(1)>', desc: 'a"b', icon: "app-file", badge: "" },
    'https://x/-/s/abc"onmouseover="x',
    "widget-chatItem"
  );
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
  assert.ok(html.includes('href="https://x/-/s/abc&quot;onmouseover=&quot;x"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.ok(html.includes("#--icon-app-file"));
});

test("composer card escapes every text", () => {
  const src = read("src/drumee/builtins/widget/chat/skeleton/link-card.js");
  for (const f of ["badge", "label", "title", "desc"]) {
    assert.match(src, new RegExp(`esc\\(model\\.${f}\\)`), f);
  }
  assert.ok(!/content: model\.(title|desc|badge)/.test(src));
});

// ── wiring ───────────────────────────────────────────────────────────────────

test("chat-item: cards attach after the bubble is in the DOM, never break a message", () => {
  const src = read("src/drumee/builtins/widget/chat-item/index.js");
  assert.ok(src.includes("this._attachLinkCards(el);"));
  assert.match(src, /_attachLinkCards\(el\) \{\n    try \{/);
  assert.ok(src.includes('this.warn("[chat-item] link card skipped", e)'));
  // a click on a card goes through the same router as the link itself
  assert.ok(src.includes("Wm.onAnchorClick({\n              target: anchor,"));
  // quoted message links are not this message's
  assert.ok(src.includes("a.closest(`.${fig}-reply__main`)"));
});

test("chat: composer card listens without touching the event, and is cleaned up", () => {
  const src = read("src/drumee/builtins/widget/chat/index.js");
  assert.ok(src.includes("this._bindComposerLinkCard();"));
  assert.ok(src.includes('this.el.removeEventListener("input", this._onComposerLinkInput, true);'));
  assert.ok(src.includes("clearTimeout(this._linkCardTimer);"));
  const handler = src.slice(src.indexOf("  _onComposerLinkInput(e) {"), src.indexOf("  _scheduleComposerLinkCheck(delay) {"));
  assert.ok(!/preventDefault|stopPropagation/.test(handler));
  assert.ok(src.includes('case "close-link-card":'));
  const skel = read("src/drumee/builtins/widget/chat/skeleton/index.js");
  assert.ok(skel.includes("require('./link-card').holder(ui)"));
  const svc = JSON.parse(read("src/drumee/lex/services.json"));
  assert.strictEqual(svc.link_preview.share, "link_preview.share");
});

test("OG images ship with the build at fixed names", () => {
  const plugins = read("webpack/plugins.js");
  assert.ok(plugins.includes("to: 'link-preview'"));
  for (const n of ["neutral", "public", "secure"]) {
    const buf = readFileSync(resolve(ROOT, `assets/link-preview/${n}.png`));
    assert.strictEqual(buf.readUInt32BE(16), 1200, n);
    assert.strictEqual(buf.readUInt32BE(20), 630, n);
  }
});
