// Share in a player's gear menu opens the secure-share panel
// (builtins/player/widget/share — click()).
//
// It used to open it only for a file in an external workspace; a private-area
// file got the "External File Sharing" dead-end modal. The server never
// restricted by area (secure_share.create checks only the write bit), so the
// row now always opens the panel: through the source MFS view when it is
// alive — it owns the share tour — and directly through Wm otherwise.
//
// The module is required as shipped. Its two webpack-only requires (the scss
// skin and the `dmz/sharebox/area` alias) are resolved here by hand.
const test = require("node:test");
const assert = require("node:assert");
const Module = require("node:module");
const { resolve } = require("node:path");

const ROOT = resolve(__dirname, "../src/drumee");
const SHARE = resolve(ROOT, "builtins/player/widget/share/index.js");
const STUB = resolve(__dirname, "helpers/alias-stub.js");

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (req, parent, ...rest) {
  if (parent && parent.filename === SHARE) {
    if (req === "./skin") return STUB;
    if (req === "dmz/sharebox/area") return resolve(ROOT, "modules/dmz/sharebox/area.js");
  }
  return origResolve.call(this, req, parent, ...rest);
};
global._ = require("underscore");
global._a = new Proxy({}, { get: (_t, k) => k });
const share = require(SHARE);
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

function withWm(fn) {
  const launched = [];
  const saved = global.Wm;
  global.Wm = { launch: (item, opts) => launched.push({ item, opts }) };
  try {
    fn(launched);
  } finally {
    global.Wm = saved;
  }
}

test("private area: delegates to the MFS view as a floating panel", () => {
  withWm((launched) => {
    const { ui, calls } = player({ area: "private" });
    share.click(ui, { service: "secure-share" });
    assert.deepStrictEqual(calls, [{ service: "secure-share", floating: 1 }]);
    assert.strictEqual(launched.length, 0);
  });
});

test("share area: still delegates the same way", () => {
  withWm((launched) => {
    const { ui, calls } = player({ area: "share" });
    share.click(ui, { service: "secure-share" });
    assert.deepStrictEqual(calls, [{ service: "secure-share", floating: 1 }]);
    assert.strictEqual(launched.length, 0);
  });
});

test("no live MFS view: launches window_secure_share directly", () => {
  withWm((launched) => {
    const { ui } = player({ area: "private", media: false });
    share.click(ui, { service: "secure-share" });
    assert.strictEqual(launched.length, 1);
    const { item, opts } = launched[0];
    assert.strictEqual(item.kind, "window_secure_share");
    assert.strictEqual(item.wm_unique_id, "window_secure_share-n1");
    assert.strictEqual(item.nid, "n1");
    assert.strictEqual(item.hub_id, "h1");
    assert.strictEqual(item.filetype, "document");
    assert.deepStrictEqual(opts, { explicit: 1, singleton: 1 });
  });
});

test("never raises the External File Sharing modal", () => {
  withWm(() => {
    let opened = 0;
    const saved = global.document;
    global.document = {
      querySelector: () => null,
      createElement: () => { opened++; throw new Error("modal opened"); },
    };
    try {
      share.click(player({ area: "private" }).ui, { service: "secure-share" });
      share.click(player({ area: "private", media: false }).ui, { service: "secure-share" });
    } finally {
      global.document = saved;
    }
    assert.strictEqual(opened, 0);
  });
});
