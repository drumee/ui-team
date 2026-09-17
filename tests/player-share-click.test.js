// Share in a player's gear menu opens the secure-share panel
// (builtins/player/widget/share — click()).
//
// It used to open it only for a file in an external workspace; a private-area
// file got the "External File Sharing" dead-end modal. The server never
// restricted by area (secure_share.create checks only the write bit), so the
// row now always opens the panel: through the source MFS view when it is
// alive — it owns the share tour — and directly through Wm otherwise.
//
// A loading card covers the wait for the panel's lazy chunk (./loading): its
// bar moves on real milestones and it stays up for a short floor, then fades
// as the panel is asked for.
//
// The module is required as shipped. Its webpack-only requires (the scss skin,
// the `dmz/sharebox/area` alias, the logo asset) are resolved here by hand.
const test = require("node:test");
const assert = require("node:assert");
const Module = require("node:module");
const { resolve } = require("node:path");

const ROOT = resolve(__dirname, "../src/drumee");
const SHARE = resolve(ROOT, "builtins/player/widget/share/index.js");
const LOADING = resolve(ROOT, "builtins/player/widget/share/loading.js");
const STUB = resolve(__dirname, "helpers/alias-stub.js");
const SVG_STUB = resolve(__dirname, "helpers/svg-asset-stub.js");

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (req, parent, ...rest) {
  if (parent && parent.filename === SHARE) {
    if (req === "./skin") return STUB;
    if (req === "dmz/sharebox/area") return resolve(ROOT, "modules/dmz/sharebox/area.js");
  }
  if (req === "assets/drumee-logo.svg") return SVG_STUB;
  return origResolve.call(this, req, parent, ...rest);
};
global._ = require("underscore");
global._a = new Proxy({}, { get: (_t, k) => k });
const share = require(SHARE);
const loading = require(LOADING);
Module._resolveFilename = origResolve;

// A player as click() sees it: a model, an optional MFS view, and _delegate
// with the players' real contract (false when there is no live media).
function player({ area = "private", media = true } = {}) {
  const calls = [];
  const attrs = { area, nid: "n1", hub_id: "h1", filetype: "document" };
  const mediaView = media
    ? { isDestroyed: () => false, mget: (k) => attrs[k], onUiEvent: () => {} }
    : null;
  const ui = {
    media: mediaView,
    mget: (k) => attrs[k],
    _delegate(cmd, args) {
      if (!this.media || this.media.isDestroyed()) return false;
      calls.push(args);
      return true;
    },
  };
  return { ui, calls };
}

async function withWm(fn) {
  const launched = [];
  const saved = global.Wm;
  global.Wm = { launch: (item, opts) => launched.push({ item, opts }) };
  try {
    await fn(launched);
  } finally {
    global.Wm = saved;
  }
}

// Records what click() does to the loading card, in order, alongside the
// panel opening — so the tests can say WHEN the panel opens relative to it.
function withCard(fn) {
  const events = [];
  const saved = loading.show;
  loading.show = () => ({
    progress: (pct) => events.push(`progress:${pct}`),
    hide: () => {
      events.push("hide");
      return Promise.resolve();
    },
  });
  return Promise.resolve()
    .then(() => fn(events))
    .finally(() => {
      loading.show = saved;
    });
}

test("private area: delegates to the MFS view as a floating panel", async () => {
  await withWm(async (launched) => {
    const { ui, calls } = player({ area: "private" });
    await share.click(ui, { service: "secure-share" });
    assert.deepStrictEqual(calls, [{ service: "secure-share", floating: 1 }]);
    assert.strictEqual(launched.length, 0);
  });
});

test("share area: still delegates the same way", async () => {
  await withWm(async (launched) => {
    const { ui, calls } = player({ area: "share" });
    await share.click(ui, { service: "secure-share" });
    assert.deepStrictEqual(calls, [{ service: "secure-share", floating: 1 }]);
    assert.strictEqual(launched.length, 0);
  });
});

test("no live MFS view: launches window_secure_share directly, floating", async () => {
  await withWm(async (launched) => {
    const { ui } = player({ area: "private", media: false });
    await share.click(ui, { service: "secure-share" });
    assert.strictEqual(launched.length, 1);
    const { item, opts } = launched[0];
    assert.strictEqual(item.kind, "window_secure_share");
    assert.strictEqual(item.wm_unique_id, "window_secure_share-n1");
    assert.strictEqual(item.nid, "n1");
    assert.strictEqual(item.hub_id, "h1");
    assert.strictEqual(item.filetype, "document");
    assert.strictEqual(item.floating, 1);
    assert.deepStrictEqual(opts, { explicit: 1, singleton: 1 });
  });
});

test("the card fills on milestones, then fades as the panel opens", async () => {
  await withWm(() => withCard(async (events) => {
    let release;
    const savedKind = global.Kind;
    global.Kind = { waitFor: () => new Promise((r) => { release = r; }) };
    try {
      const { ui, calls } = player({ area: "private" });
      ui._delegate = function (cmd, args) {
        events.push("open");
        calls.push(args);
        return true;
      };
      const started = Date.now();
      const pending = share.click(ui, { service: "secure-share" });
      assert.deepStrictEqual(events, ["progress:15"], "card up, nothing open before the chunk");
      release();
      await pending;
      assert.deepStrictEqual(events, ["progress:15", "progress:70", "progress:100", "hide", "open"]);
      // The floor: a chunk that resolves at once still keeps the card up.
      assert.ok(Date.now() - started >= 500, "card stayed up for its minimum");
    } finally {
      global.Kind = savedKind;
    }
  }));
});

test("a chunk that fails to load still takes the card down and still opens", async () => {
  await withWm(() => withCard(async (events) => {
    const savedKind = global.Kind;
    global.Kind = { waitFor: () => Promise.reject(new Error("chunk")) };
    try {
      const { ui, calls } = player({ area: "private" });
      await share.click(ui, { service: "secure-share" });
      assert.strictEqual(calls.length, 1);
      assert.ok(events.includes("hide"));
    } finally {
      global.Kind = savedKind;
    }
  }));
});

test("no DOM to draw into: the card is a no-op and the click still opens", async () => {
  await withWm(async () => {
    const { ui, calls } = player({ area: "private" });
    const card = loading.show(ui);
    card.progress(50);
    await card.hide();
    await share.click(ui, { service: "secure-share" });
    assert.strictEqual(calls.length, 1);
  });
});

test("never raises the External File Sharing modal", async () => {
  await withWm(async () => {
    let opened = 0;
    const saved = global.document;
    global.document = {
      querySelector: () => null,
      createElement: () => { opened++; throw new Error("modal opened"); },
    };
    try {
      await share.click(player({ area: "private" }).ui, { service: "secure-share" });
      await share.click(player({ area: "private", media: false }).ui, { service: "secure-share" });
    } finally {
      global.document = saved;
    }
    assert.strictEqual(opened, 0);
  });
});
