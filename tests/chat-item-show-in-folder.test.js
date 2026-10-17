// chat-item-show-in-folder.test.js — "Show in folder" on a chat attachment card.
//
//   node --test tests/chat-item-show-in-folder.test.js
//
// The card is the message's sandbox copy, never the workspace file, so the
// click asks channel.attachment_location which file it stands for and lands
// the desk pane on THAT file's folder, highlighting it. Runs the real
// _showInFolder / _isPeerChat against stub widgets.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs
  .readFileSync(
    path.join(__dirname, "../src/drumee/builtins/widget/chat-item/index.js"),
    "utf8",
  )
  .replace(/\r\n/g, "\n");

const _ = {
  isString: (v) => typeof v === "string",
  isArray: Array.isArray,
  isFunction: (v) => typeof v === "function",
};
const _a = { nid: "nid", hub_id: "hub_id", uiHandler: "uiHandler" };

// The module constant, read from source so the test tracks it.
const REVEAL_TTL = Number(/const REVEAL_TTL = (\d+);/.exec(SRC)[1]);

function load(Wm, LOCALE = { FILE_NOT_FOUND: "File not found" }) {
  const make = (sig) =>
    new Function(
      "_", "_a", "Wm", "LOCALE", "SERVICE", "REVEAL_TTL",
      `return ${sliceFunction(SRC, sig)}`,
    )(_, _a, Wm, LOCALE, {}, REVEAL_TTL);
  return {
    showInFolder: make("async _showInFolder(trigger)"),
    isPeerChat: make("_isPeerChat()"),
  };
}

function card(attrs, el) {
  return { el, model: {}, mget: (k) => attrs[k] };
}

function item({ cards, hub = "team", metadata, answer }) {
  const calls = [];
  return {
    calls,
    getItemsByKind: (k) => (k === "media_grid" ? cards : []),
    _chatHubId: () => hub,
    mget: (k) => (k === "metadata" ? metadata : undefined),
    fetchService: async (svc, args) => {
      calls.push({ svc, args });
      return answer;
    },
    warn() {},
  };
}

test("lands on the RESOLVED file's folder, not the card's", async () => {
  const opened = [];
  const order = [];
  const Wm = {
    clearReveal: () => order.push("clear"),
    openNotificationLocation: (a) => {
      order.push("open");
      opened.push(a);
    },
    alert() {},
  };
  const { showInFolder } = load(Wm);
  const link = {};
  const clicked = card(
    { nid: "copy", hub_id: "team", folder_nid: undefined },
    { contains: (t) => t === link },
  );
  const other = card({ nid: "other" }, { contains: () => false });
  const self = item({
    cards: [other, clicked],
    metadata: '{"_scope_nid":"root1"}',
    answer: { nid: "src", hub_id: "team", pid: "root1", filetype: "document" },
  });

  await showInFolder.call(self, link);

  assert.equal(self.calls[0].svc, "channel.attachment_location");
  const args = self.calls[0].args;
  assert.equal(args.hub_id, "team");
  assert.equal(args.attachment_nid, "copy");
  assert.equal(args.attachment_hub_id, "team");
  assert.equal(args.scope_nid, "root1");
  assert.equal(typeof args._ts, "number");
  assert.deepEqual(opened, [
    {
      hub_id: "team",
      nid: "src",
      pid: "root1",
      filetype: "document",
      activeTab: "files",
      highlight: 1,
      revealTtl: 5000,
    },
  ]);
  // The previous reveal's highlight goes first, so only this file is lit.
  assert.deepEqual(order, ["clear", "open"]);
});

test("nothing found → says so, opens nothing", async () => {
  const opened = [];
  const alerts = [];
  let cleared = 0;
  const Wm = {
    clearReveal: () => cleared++,
    openNotificationLocation: (a) => opened.push(a),
    alert: (m) => alerts.push(m),
  };
  const { showInFolder } = load(Wm);
  const link = {};
  const self = item({
    cards: [card({ nid: "copy", hub_id: "team" }, { contains: () => true })],
    answer: { status: "NOT_FOUND" },
  });
  await showInFolder.call(self, link);
  assert.deepEqual(opened, []);
  assert.deepEqual(alerts, ["File not found"]);
  // A failed lookup leaves the current highlight where it is.
  assert.equal(cleared, 0);
});

test("p2p rows are peer chats; hub chats are not", () => {
  const { isPeerChat } = load({});
  const of = (uh) => isPeerChat.call({ mget: () => uh });
  assert.equal(of({ hubId: "h", peerId: "p" }), true);
  assert.equal(of([{ peerId: "p" }]), true);
  assert.equal(of({ hubId: "h", peerId: "" }), false);
  assert.equal(of(undefined), false);
});

// ── Timed reveal (Wm._applyReveal with opt.ttl) + fade-out clear ─────────
// `fly`: stand-in for _flyReveal (geometry and Web Animations are checked in
// a real browser, not here) — records the flight and lands it at once.
// `inView`: what _revealInView answers.
function revealHost(document, { inView = () => false, fly } = {}) {
  const WSRC = fs
    .readFileSync(path.join(__dirname, "../src/drumee/builtins/window/utils.js"), "utf8")
    .replace(/\r\n/g, "\n");
  const mk = (sig) =>
    new Function("document", `return ${sliceFunction(WSRC, sig)}`)(document);
  const flights = [];
  return {
    flights,
    _applyReveal: mk("_applyReveal(cells, scrollFirst, opt = {})"),
    _fadeOutReveal: mk("_fadeOutReveal(el, fadeMs = 900)"),
    _revealSwitchFrom: mk("_revealSwitchFrom(maxAgeMs = 1500)"),
    _switchReveal: mk("_switchReveal(item)"),
    clearReveal: mk("clearReveal()"),
    _revealInView: inView,
    _flyReveal:
      fly ||
      ((from, to, done) => {
        flights.push([from, to]);
        done();
        return true;
      }),
    warn() {},
  };
}

// A media cell as far as the reveal touches it: data-* attributes mirrored
// into dataset like the DOM does, and media/core's _setNotifyHighlight.
function cell() {
  const dataset = {};
  const key = (attr) =>
    attr.replace(/^data-/, "").replace(/-([a-z])/g, (m, c) => c.toUpperCase());
  const el = {
    dataset,
    isConnected: true,
    offsetWidth: 150,
    offsetHeight: 180,
    classList: { add() {}, remove() {} },
    scrollIntoView() {},
    removeAttribute: (attr) => delete dataset[key(attr)],
  };
  return {
    el,
    get lit() {
      return dataset.uiHighlight != null;
    },
    _setNotifyHighlight(on) {
      if (on) dataset.uiHighlight = 1;
      else delete dataset.uiHighlight;
    },
  };
}

test("timed reveal: animates in, fades out at the ttl, then clears", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const host = revealHost({ querySelectorAll: () => [] });
  const a = cell();
  host._applyReveal([a], true, { ttl: 5000 });
  assert.equal(a.lit, true);
  assert.equal(a.el.dataset.reveal, 1);
  t.mock.timers.tick(5000);
  // Fading: colour still on while the out-animation runs.
  assert.equal(a.el.dataset.reveal, "out");
  assert.equal(a.lit, true);
  t.mock.timers.tick(900);
  assert.equal(a.lit, false);
  assert.equal(a.el.dataset.reveal, undefined);
});

test("a newer reveal owns the timer: the old one never un-lights it", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const host = revealHost({ querySelectorAll: () => [] });
  const a = cell();
  const b = cell();
  host._applyReveal([a], true, { ttl: 5000 });
  t.mock.timers.tick(3000);
  host._applyReveal([b], true, { ttl: 5000 });
  t.mock.timers.tick(2500); // past a's original deadline
  assert.equal(b.lit, true);
  assert.equal(b.el.dataset.reveal, 1);
  t.mock.timers.tick(2500); // b's ttl ends: fading
  assert.equal(b.el.dataset.reveal, "out");
  t.mock.timers.tick(900);
  assert.equal(b.lit, false);
});

test("clearReveal fades every lit cell out and cancels the pending timer", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const a = cell();
  const n = cell(); // a notification highlight: lit, no data-reveal
  n._setNotifyHighlight(true);
  const host = revealHost({
    querySelectorAll: (sel) =>
      sel === "[data-ui-highlight]" ? [a, n].filter((c) => c.lit).map((c) => c.el) : [],
  });
  host._applyReveal([a], true, { ttl: 5000 });
  host.clearReveal();
  assert.equal(host._revealTimer, null);
  assert.equal(a.el.dataset.reveal, "out");
  assert.equal(n.el.dataset.reveal, "out");
  assert.equal(a.lit && n.lit, true); // still on during the fade
  t.mock.timers.tick(900);
  assert.equal(a.lit, false);
  assert.equal(n.lit, false);
});

test("the same file re-lit mid-fade stays lit", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const a = cell();
  const host = revealHost({
    querySelectorAll: (sel) => (sel === "[data-ui-highlight]" && a.lit ? [a.el] : []),
  });
  host._applyReveal([a], true, { ttl: 5000 });
  host.clearReveal(); // a starts fading…
  host._applyReveal([a], true, { ttl: 5000 }); // …and is revealed again
  t.mock.timers.tick(900);
  assert.equal(a.lit, true);
  assert.equal(a.el.dataset.reveal, 1);
  // Same for an untimed (notification) reveal landing mid-fade.
  host.clearReveal();
  host._applyReveal([a], true);
  t.mock.timers.tick(900);
  assert.equal(a.lit, true);
});

test("without a ttl the highlight stays (notification reveals)", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const host = revealHost({ querySelectorAll: () => [] });
  const a = cell();
  host._applyReveal([a], true);
  t.mock.timers.tick(60000);
  assert.equal(a.lit, true);
  assert.equal(a.el.dataset.reveal, undefined);
});

// ── Switch: the highlight travels from the previous file to the next ───────
function litDoc(cells) {
  return {
    querySelectorAll: (sel) => {
      const els = cells.map((c) => c.el);
      if (sel === "[data-ui-highlight]") return els.filter((e) => e.dataset.uiHighlight != null);
      if (sel === '[data-reveal="out"]') return els.filter((e) => e.dataset.reveal === "out");
      return [];
    },
  };
}

test("switch: both in view → flies A→B, A cut at take-off, B lands without pop", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const a = cell();
  const b = cell();
  let landedAt = null;
  const host = revealHost(litDoc([a, b]), {
    inView: () => true,
    fly(from, to, done) {
      host.flights.push([from, to]);
      // At take-off: A already dark, B not lit yet.
      assert.equal(b.lit, false);
      landedAt = () => done();
      return true;
    },
  });
  host._applyReveal([a], true, { ttl: 5000 });
  host.clearReveal();
  host._applyReveal([b], true, { ttl: 5000 });
  assert.deepEqual(host.flights, [[a.el, b.el]]);
  assert.equal(a.lit, false); // cut, not left fading under the ghost
  assert.equal(b.lit, false);
  landedAt();
  assert.equal(b.lit, true);
  assert.equal(b.el.dataset.reveal, "land");
  // The ttl still applies to the switched-to file.
  t.mock.timers.tick(5000);
  assert.equal(b.el.dataset.reveal, "out");
  t.mock.timers.tick(900);
  assert.equal(b.lit, false);
});

test("switch skipped when either cell is out of view → fade + pop as before", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const a = cell();
  const b = cell();
  const host = revealHost(litDoc([a, b]), { inView: (el) => el === a.el });
  host._applyReveal([a], true, { ttl: 5000 });
  host.clearReveal();
  host._applyReveal([b], true, { ttl: 5000 });
  assert.deepEqual(host.flights, []);
  assert.equal(b.lit, true);
  assert.equal(b.el.dataset.reveal, 1); // the pop-in state
  assert.equal(a.el.dataset.reveal, "out"); // A fades on its own
});

test("switch skipped when the animation cannot run (reduced motion)", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const a = cell();
  const b = cell();
  const host = revealHost(litDoc([a, b]), {
    inView: () => true,
    fly: () => false,
  });
  host._applyReveal([a], true, { ttl: 5000 });
  host.clearReveal();
  host._applyReveal([b], true, { ttl: 5000 });
  assert.equal(b.lit, true);
  assert.equal(b.el.dataset.reveal, 1);
});

test("no switch from a stale or vanished cell", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const a = cell();
  const b = cell();
  const host = revealHost(litDoc([a, b]), { inView: () => true });
  host._applyReveal([a], true, { ttl: 5000 });
  host.clearReveal();
  t.mock.timers.tick(2000); // the folder took too long: no flight
  host._applyReveal([b], true, { ttl: 5000 });
  assert.deepEqual(host.flights, []);

  const c = cell();
  host.clearReveal();
  b.el.isConnected = false; // grid replaced (folder change)
  host._applyReveal([c], true, { ttl: 5000 });
  assert.deepEqual(host.flights, []);
});
