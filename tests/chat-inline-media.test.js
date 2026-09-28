// Chat images / videos shown inline, and opened inside the Inbox.
//
// Four real modules, everything around them stubbed:
//   media/grid/template   — the inline <img> / <video> markup
//   media/grid (media_grid) — wiring the inline element (fallbacks, controls)
//   desk/wm openContent   — an Inbox tile is shown by the Inbox, not a WM viewer
//   window/manager        — one visible viewer per picture
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const SRC = path.join(__dirname, "..", "src/drumee");

// A permissive stand-in for any dependency these modules pull in: callable,
// constructible, extendable, and every property is another stub.
function makeStub() {
  const fn = function () {};
  const stub = new Proxy(fn, {
    get: (t, k) => {
      if (k === "prototype") return t.prototype;
      if (k === Symbol.toPrimitive) return () => "";
      if (k === "default") return stub;
      if (k === "then") return undefined;
      return stub;
    },
    apply: () => stub,
    construct: () => ({}),
  });
  return stub;
}

// Load `file` for real; stub every module IT requires, except the listed
// ones. The hook stays installed: several of these modules require lazily,
// inside the function under test.
function loadIsolated(file, keep = {}) {
  const target = require.resolve(file);
  const load = Module._load;
  Module._load = function (request, parent, isMain) {
    if (parent && parent.filename === target) {
      if (Object.prototype.hasOwnProperty.call(keep, request)) return keep[request];
      return makeStub();
    }
    return load.call(this, request, parent, isMain);
  };
  delete require.cache[target];
  return require(target);
}

global._ = require("underscore");
const lex = require(path.join(SRC, "lex/attribute.js"));
global._a = new Proxy(lex, { get: (t, k) => (k in t ? t[k] : k) });
global._e = new Proxy({}, { get: (t, k) => k });
global.LOCALE = new Proxy({}, { get: (t, k) => k });
global.Visitor = { inDmz: false, id: "ME" };
global.Template = { Xmlns: (n) => `<use href="#${n}"/>`, SvgText: () => "" };
global.Dayjs = () => ({ diff: () => 0, fromNow: () => "", format: () => "" });
global.Dayjs.unix = () => global.Dayjs();

// ── Template ─────────────────────────────────────────────────────────
const tpl = loadIsolated(path.join(SRC, "builtins/media/grid/template/index.js"), {
  "libs/file-meta": { humanFileSize: () => "1.2 MB", chipGlyph: () => "g" },
  "./preview": () => `<div class="preview-container">thumb</div>`,
  "./folder": () => "",
  "./filename": () => `<div class="filename">pic.png</div>`,
  "../../template/command": () => "",
  "../../template/notify": () => "",
});

function tile(attrs) {
  const m = { filetype: "image", filesize: 1234, isAttachment: 1, ...attrs };
  return {
    _id: "t1",
    fig: { family: "media-grid" },
    model: { toJSON: () => ({ ...m }) },
    imgCapable: () => true,
    actualNode: (f) => ({ url: `/file/${f}/N1/H1` }),
  };
}

test("an inline chat image renders the picture, falling back to the original", () => {
  const html = tpl(tile({ inlineMedia: 1 }));
  assert.match(html, /inline-media/);
  assert.match(html, /<img class="media-grid__inline-img" src="\/file\/slide\/N1\/H1" data-orig="\/file\/orig\/N1\/H1"/);
  assert.match(html, /media-grid__chatmeta/, "name + size line kept");
  assert.doesNotMatch(html, /thumb/, "not the 44px card");
});

test("an inline chat video renders a playable video with the slide as poster", () => {
  const html = tpl(tile({ inlineMedia: 1, filetype: "video" }));
  assert.match(html, /<video class="media-grid__inline-video" src="\/file\/orig\/N1\/H1" poster="\/file\/slide\/N1\/H1" controls preload="none"/);
});

test("without inlineMedia, and for composer chips and other files, the card is unchanged", () => {
  assert.doesNotMatch(tpl(tile({})), /inline-media/);
  assert.doesNotMatch(tpl(tile({ inlineMedia: 1, iconOnly: 1 })), /inline-media/);
  assert.doesNotMatch(tpl(tile({ inlineMedia: 1, filetype: "document" })), /inline-media/);
  assert.doesNotMatch(tpl(tile({ inlineMedia: 1, isAttachment: 0 })), /inline-media/);
});

// ── media_grid inline wiring ─────────────────────────────────────────
global.DrumeeMediaInteract = class {};
const Grid = loadIsolated(path.join(SRC, "builtins/media/grid/index.js"));

function fakeEl(tag) {
  const h = {};
  return {
    tagName: tag,
    dataset: {},
    src: "",
    listeners: h,
    addEventListener: (ev, fn) => { (h[ev] = h[ev] || []).push(fn); },
    fire(ev, e = {}) { (h[ev] || []).forEach((fn) => fn(e)); },
  };
}

function gridWith(child) {
  const g = Object.create(Grid.prototype);
  const model = { inlineMedia: 1 };
  let rerendered = 0;
  Object.assign(g, {
    mget: (k) => model[k],
    mset: (k, v) => { model[k] = v; },
    isDestroyed: () => false,
    innerContent: () => { rerendered++; return "card"; },
    content: {
      el: {
        innerHTML: "",
        dispatchEvent() {},
        querySelector: (sel) =>
          (sel.includes("inline-img") && child.tagName === "IMG") ||
          (sel.includes("inline-video") && child.tagName === "VIDEO")
            ? child
            : null,
      },
    },
  });
  return { g, model, rerendered: () => rerendered };
}

test("inline image: a missing slide falls back to the original, then to the card", () => {
  const img = fakeEl("IMG");
  img.dataset.orig = "/file/orig/N1/H1";
  const { g, model, rerendered } = gridWith(img);
  g._wireInlineMedia();
  img.fire("error");
  assert.equal(img.src, "/file/orig/N1/H1");
  assert.equal(rerendered(), 0);
  img.fire("error");
  assert.equal(rerendered(), 1, "neither loads: the ordinary file card");
  assert.equal(model.inlineMedia, 0);
});

test("inline image: once loaded it bubbles a growth event so the chat re-pins", () => {
  const img = fakeEl("IMG");
  const sent = [];
  img.dispatchEvent = (ev) => sent.push(ev);
  const { g } = gridWith(img);
  g._wireInlineMedia();
  img.fire("load");
  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, "drumee:inline-media-grown");
  assert.equal(sent[0].bubbles, true);
});

test("inline video: its controls do not open the viewer or drag the tile", () => {
  const video = fakeEl("VIDEO");
  const { g, rerendered } = gridWith(video);
  g._wireInlineMedia();
  for (const ev of ["mousedown", "click", "dblclick"]) {
    let stopped = 0;
    video.fire(ev, { stopPropagation: () => { stopped++; } });
    assert.equal(stopped, 1, `${ev} stays on the video`);
  }
  let stopped = 0;
  video.fire("pointerdown", { stopPropagation: () => { stopped++; } });
  assert.equal(stopped, 0, "pointerdown still reaches the page: outside-press closes menus");
  video.fire("error");
  assert.equal(rerendered(), 1, "unplayable codec: the card, which opens the player");
});

// ── desk Wm.openContent routes Inbox tiles to the Inbox ──────────────
class PushStub {
  openContent(media) { this.launched.push(media); return true; }
}
const DeskWm = loadIsolated(path.join(SRC, "modules/desk/wm/index.js"), { "./push": PushStub });

function media(filetype, inInbox) {
  const inbox = { shown: [], previewMedia(m) { this.shown.push(m); } };
  let waited = null;
  return {
    inbox,
    waited: () => waited,
    mget: (k) => ({ filetype })[k],
    wait: (v) => { waited = v; },
    getParentByKind: (k) => (inInbox && k === "chat_p2p" ? inbox : null),
  };
}

test("an image or video clicked in the Inbox is shown by the Inbox, not launched behind it", () => {
  for (const type of ["image", "video"]) {
    const wm = Object.create(DeskWm.prototype);
    wm.launched = [];
    const m = media(type, true);
    wm.openContent(m, {});
    assert.equal(m.inbox.shown.length, 1, type);
    assert.equal(wm.launched.length, 0, `${type}: no hidden WM viewer`);
    assert.equal(m.waited(), 0, "tile released");
  }
});

test("outside the Inbox, and for other file types, the regular viewer opens", () => {
  const wm = Object.create(DeskWm.prototype);
  wm.launched = [];
  wm.openContent(media("image", false), {});
  wm.openContent(media("document", true), {});
  assert.equal(wm.launched.length, 2);
});

// ── window/manager: one visible viewer per picture ───────────────────
global.window = global.window || {};
const Manager = loadIsolated(path.join(SRC, "builtins/window/manager.js"));

function managerWith(win) {
  const mgr = Object.create(Manager.prototype);
  mgr.getWindowsPool = () => ({ children: { find: (fn) => (win && fn(win) ? win : undefined) } });
  return mgr;
}
const viewer = (attrs, rects) => ({
  mget: (k) => ({ nid: "N1", kind: "image_player", ...attrs })[k],
  isDestroyed: () => false,
  el: { getClientRects: () => ({ length: rects }) },
});
const img = { mget: (k) => ({ nid: "N1" })[k] };

test("an image viewer counts as already open only when it is on screen or in the dock", () => {
  assert.equal(managerWith(viewer({}, 1))._imageViewerShown(img), true);
  assert.equal(managerWith(viewer({}, 0))._imageViewerShown(img), false, "hidden docked viewer: open a new one");
  assert.equal(managerWith(viewer({ minimize: 1 }, 0))._imageViewerShown(img), true);
  assert.equal(managerWith(viewer({ kind: "window_folder" }, 1))._imageViewerShown(img), false);
  assert.equal(managerWith(null)._imageViewerShown(img), false);
});

test("inline image: the frame is marked loaded once the picture is in", () => {
  const img = fakeEl("IMG");
  const frame = { dataset: {} };
  const { g } = gridWith(img);
  const qs = g.content.el.querySelector;
  g.content.el.querySelector = (sel) => (sel === ".media-grid__inline" ? frame : qs(sel));
  g.content.el.dispatchEvent = () => {};
  img.dispatchEvent = () => {};
  g._wireInlineMedia();
  assert.equal(frame.dataset.loaded, undefined);
  img.fire("load");
  assert.equal(frame.dataset.loaded, "1");
});

// ── chat-item: laying a message out around its inline media ──────────
global.LetcBox = class { static initClass() {} };
const ChatItem = loadIsolated(path.join(SRC, "builtins/widget/chat-item/index.js"));

function message({ text = "", tiles = [], quote = false }) {
  const bubble = { dataset: {}, querySelector: (s) => (quote && s.includes("-reply__main") ? {} : null) };
  const wrapper = { dataset: {} };
  const contents = tiles.map((t) => ({ t }));
  const list = {
    querySelectorAll: (sel) =>
      contents.filter(({ t }) => {
        if (sel === ".media-grid__content") return true;
        if (sel === ".media-grid__content.inline-media") return t !== "card";
        if (sel === ".media-grid__content.inline-media.image") return t === "image";
        return false;
      }),
  };
  const w = Object.create(ChatItem.prototype);
  w.fig = { family: "widget-chatItem" };
  w.mget = (k) => ({ message: text })[k];
  w.el = {
    querySelector: (s) =>
      s.endsWith("__conversation-content") ? bubble
        : s.endsWith("__attachment-wrapper") ? wrapper
          : s.endsWith("__attachment-wrapper-list") ? list : null,
  };
  w._stampInlineLayout();
  return { bubble, wrapper };
}

test("a pictures-only message drops the bubble frame; text, a quote or a file keeps it", () => {
  assert.equal(message({ tiles: ["image"] }).bubble.dataset.mediaOnly, "1");
  assert.equal(message({ tiles: ["video"] }).bubble.dataset.mediaOnly, "1");
  assert.equal(message({ text: "look", tiles: ["image"] }).bubble.dataset.mediaOnly, "0");
  assert.equal(message({ tiles: ["image"], quote: true }).bubble.dataset.mediaOnly, "0");
  assert.equal(message({ tiles: ["image", "card"] }).bubble.dataset.mediaOnly, "0");
});

test("two or more pictures (images only) tile as an album", () => {
  assert.equal(message({ tiles: ["image", "image"] }).wrapper.dataset.album, "1");
  assert.equal(message({ tiles: ["image"] }).wrapper.dataset.album, "0");
  assert.equal(message({ tiles: ["image", "video"] }).wrapper.dataset.album, "0");
  assert.equal(message({ tiles: ["image", "card"] }).wrapper.dataset.album, "0");
});
