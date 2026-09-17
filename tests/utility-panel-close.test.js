// Topbar bell / Contacts / Trash: pressing the icon while its panel is open
// closes the panel, and an icon is lit only while its panel is open.
//
// Methods are cut out of the SOURCE FILE and run against a fake `this`, as
// tests/rail-logo-home.test.js does.
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const DESK = resolve(__dirname, "../src/drumee/modules/desk/index.js");
const TOPBAR = resolve(__dirname, "../src/drumee/modules/desk/skeleton/topbar.js");
const src = readFileSync(DESK, "utf8");

function grab(name) {
  const m = new RegExp(`\\n  (async )?${name}\\(`).exec(src);
  assert.ok(m, `${name} not found`);
  const start = m.index + 1;
  return src.slice(start, src.indexOf("\n  }\n", start) + 4);
}

const UTILITY_PANELS = new Function(
  /\nconst UTILITY_PANELS = (\[[\s\S]*?\]);/.exec(src)[1].replace(/^/, "return "),
)();

// A view with a model state and an element.
function view(state = 0, dataset = {}) {
  const v = {
    _state: state,
    el: { dataset },
    mget: (k) => (k === "state" ? v._state : undefined),
    setState: (s) => { v._state = s; v.el.dataset.state = String(s); },
  };
  return v;
}

// A slot holding one mounted panel.
function slot(childAnim) {
  const child = childAnim === null ? null : { el: { dataset: { anim: childAnim } } };
  return {
    child,
    isEmpty: () => !child,
    children: { last: () => child },
  };
}

function desk({ activity = 0, contacts = null, trash = null, screen = null } = {}) {
  const parts = {
    "activity-panel": view(activity),
    "chat-panel": slot(contacts),
    "trash-panel": slot(trash),
    "utility-activity": view(1),
    "utility-contacts": view(1),
    "utility-trash": view(1),
  };
  let restored = 0;
  parts.breadcrumb = { _restoreCurrentPath: () => restored++ };
  const d = new Function(
    "_", "_a", "UTILITY_PANELS",
    `return { ${["_utilityPanelOpen", "_closeUtilityPanel", "_syncUtilityLights"].map(grab).join(",\n")} };`,
  )({ isFunction: (f) => typeof f === "function" }, { state: "state" }, UTILITY_PANELS);
  d.getPart = (pn) => parts[pn];
  d.ensurePart = (pn) => Promise.resolve(parts[pn]);
  d._pendingKinds = {
    "chat-panel": contacts === null ? null : "address_book",
    "trash-panel": trash === null ? null : "panel_trash",
  };
  d._hidePanel = (p) => { p.children.last().el.dataset.anim = "out"; };
  d._currentScreenService = () => screen;
  return { d, parts, restored: () => restored };
}

test("reads open from the panel itself", () => {
  let { d } = desk({ activity: 1, contacts: "in", trash: "out" });
  assert.equal(d._utilityPanelOpen("toggle-activity"), true);
  assert.equal(d._utilityPanelOpen("toggle-contacts"), true);
  assert.equal(d._utilityPanelOpen("toggle-trash"), false);

  ({ d } = desk({ activity: 0, contacts: null, trash: "in" }));
  assert.equal(d._utilityPanelOpen("toggle-activity"), false);
  assert.equal(d._utilityPanelOpen("toggle-contacts"), false);
  assert.equal(d._utilityPanelOpen("toggle-trash"), true);

  // The Inbox shares nothing with chat-panel any more, but a different kind in
  // the slot must never read as Contacts being open.
  ({ d } = desk({ contacts: "in" }));
  d._pendingKinds["chat-panel"] = "chat_p2p";
  assert.equal(d._utilityPanelOpen("toggle-contacts"), false);
});

for (const [service, opts, check] of [
  ["toggle-activity", { activity: 1 }, (parts) => parts["activity-panel"]._state === 0],
  ["toggle-contacts", { contacts: "in" }, (parts) => parts["chat-panel"].child.el.dataset.anim === "out"],
  ["toggle-trash", { trash: "in" }, (parts) => parts["trash-panel"].child.el.dataset.anim === "out"],
]) {
  test(`${service}: closing an open panel unlights its icon and restores the path`, async () => {
    const { d, parts, restored } = desk(opts);
    const btn = UTILITY_PANELS.find((u) => u.service === service).button;
    assert.equal(d._utilityPanelOpen(service), true);
    await d._closeUtilityPanel(service);
    assert.ok(check(parts), "panel still open");
    assert.equal(d._utilityPanelOpen(service), false);
    assert.equal(parts[btn]._state, 0, "icon still lit");
    assert.equal(restored(), 1);
  });
}

test("closing over a section screen leaves that screen's title alone", async () => {
  const { d, restored } = desk({ trash: "in", screen: "toggle-calendar" });
  await d._closeUtilityPanel("toggle-trash");
  assert.equal(restored(), 0);
});

test("lights: an icon whose panel closed elsewhere goes off; open or loading stays", () => {
  const { d, parts } = desk({ activity: 1, contacts: "out", trash: null });
  parts["utility-trash"].el.dataset.loading = "1";
  d._syncUtilityLights();
  assert.equal(parts["utility-activity"]._state, 1, "open panel unlit");
  assert.equal(parts["utility-contacts"]._state, 0, "closed panel still lit");
  assert.equal(parts["utility-trash"]._state, 1, "a spinning icon was touched");
});

test("lights: a panel still sliding in keeps its icon lit, but is not closable", () => {
  const { d, parts } = desk({ contacts: "" });
  // Mounted, no data-anim yet — address_book before its fetches land.
  delete parts["chat-panel"].child.el.dataset.anim;
  d._pendingKinds["chat-panel"] = "address_book";
  d._syncUtilityLights();
  assert.equal(parts["utility-contacts"]._state, 1);
  assert.equal(d._utilityPanelOpen("toggle-contacts"), false);
  assert.equal(d._utilityPanelOpen("toggle-contacts", { pending: true }), true);
});

test("wired: each case closes an open panel first; the icons carry part names", () => {
  for (const [svc, next] of [
    ["toggle-activity", "toggle-inbox"],
    ["toggle-contacts", "toggle-settings"],
    ["toggle-trash", "upgrade-plan"],
  ]) {
    const start = src.indexOf(`      case "${svc}":`);
    assert.ok(start > 0, svc);
    const body = src.slice(start, src.indexOf(`      case "${next}":`, start));
    const guard = body.indexOf("if (this._utilityPanelOpen(service)) return this._closeUtilityPanel(service);");
    assert.ok(guard > 0, `${svc} has no close guard`);
    assert.ok(guard < body.indexOf("breadcrumb:context") || body.indexOf("breadcrumb:context") < 0,
      `${svc} retitles the bar before closing`);
  }
  const topbar = readFileSync(TOPBAR, "utf8");
  for (const { service, button } of UTILITY_PANELS) {
    const at = topbar.indexOf(`service: "${service}",`);
    assert.ok(at > 0, service);
    assert.match(topbar.slice(at, topbar.indexOf("}),", at)), new RegExp(`pn: "${button}"`));
  }
  assert.match(grab("onDomRefresh"), /this\._installUtilityLights\(\)/);
});

// A press on a rail __nav-main row closes Notifications / Contacts / Trash and
// clears their topbar icons.
test("rail nav press closes the slide-outs and clears all three icons", async () => {
  const { d, parts } = desk({ activity: 1, contacts: "in", trash: "in" });
  const extra = new Function(
    "_", "_a", "UTILITY_PANELS", "Promise",
    `return { ${grab("_closeUtilityPanelsForRail")} };`,
  )({ isFunction: (f) => typeof f === "function" }, { state: "state" }, UTILITY_PANELS, Promise);
  Object.assign(d, extra);
  let closed = 0;
  d.closeOtherSidebarPanels = (except) => {
    assert.equal(except, undefined, "must close all three, with no exception");
    closed++;
    parts["activity-panel"].setState(0);
    parts["chat-panel"].child.el.dataset.anim = "out";
    parts["trash-panel"].child.el.dataset.anim = "out";
    return Promise.resolve();
  };
  // A spinning icon is cleared too.
  parts["utility-trash"].el.dataset.loading = "1";
  await d._closeUtilityPanelsForRail();
  assert.equal(closed, 1);
  for (const { service, button } of UTILITY_PANELS) {
    assert.equal(parts[button]._state, 0, `${button} still lit`);
    assert.equal(d._utilityPanelOpen(service), false, `${service} still open`);
  }
});

test("wired: only a real __nav-main press closes them, not the footer or a shim", () => {
  const set = /const RAIL_NAV_SERVICES = new Set\(\[([\s\S]*?)\]\);/.exec(src);
  assert.ok(set, "RAIL_NAV_SERVICES missing");
  const services = [...set[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(services, ["rail-access", "rail-chat", "rail-files", "rail-meet", "rail-task"]);

  const body = src.slice(src.indexOf("  onUiEvent(cmd, args = {}) {"));
  const railRow = body.indexOf('cmd.mget("railRow")');
  const call = body.indexOf("if (RAIL_NAV_SERVICES.has(service)) this._closeUtilityPanelsForRail();");
  assert.ok(railRow > 0 && call > railRow, "must sit inside the clicked-rail-row branch");
  assert.ok(call < body.indexOf("switch (service)"), "must run before the rail service");
});
