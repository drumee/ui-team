#!/usr/bin/env node

/**
 * THE ADDRESS CHIP IS THE WORKSPACE SWITCHER.
 *
 * Three changes, one control:
 *
 *   - `desk-module-topbar__crumb-group` — the chip drawn around the breadcrumb
 *     and the caret — answers the click and opens `__ws-menu`.
 *   - `__ws-btn`, the caret, is inert and has no tooltip. It is drawn, not
 *     pressed; a widget that answered its own click would stopPropagation
 *     (ui-core letc.js __handleClick) and keep the click from ever reaching
 *     the chip, so the caret would open the menu and the rest of it would not.
 *   - the panel drops from the CHIP's left edge, not the caret's.
 *
 * That last one is a positioning-context swap, and it is why the panel used to
 * hang out to the right of the address: `.menu-topic-items__wrapper` is
 * absolute at `left: 0`, so it lands on the left edge of whatever positions it
 * — which was `__ws-wrapper`, the caret alone, at the far right of the chip.
 *
 * Measured in headless chromium against the compiled topbar.css, chip 8→164
 * with its caret at 142→158:
 *
 *   before   panel.left = 142   (the caret's left edge, 134px into the chip)
 *   after    panel.left = 8     (the chip's left edge), 6px below the chip
 *
 * Run from ui-team with:
 *   node --test tests/ws-switcher-chip-trigger.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const read = (p) => readFileSync(join(REPO_ROOT, p), "utf8");

const SKEL = read("src/drumee/modules/desk/skeleton/topbar.js");
const DESK = read("src/drumee/modules/desk/index.js");
const SCSS = read("src/drumee/modules/desk/skin/topbar.scss");

function slice(src, header) {
  const start = src.indexOf(header);
  assert.notEqual(start, -1, `${header} not found`);
  const open = src.indexOf("{", start + header.length - 1);
  let depth = 0;
  for (let j = open; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) return src.slice(start, j + 1);
  }
  assert.fail(`${header} unbalanced`);
}

function method(src, header, globals) {
  const body = slice(src, header);
  const names = Object.keys(globals);
  const name = header.replace(/^async\s+/, "").split("(")[0].trim();
  // eslint-disable-next-line no-new-func
  return new Function(...names, `return ({ ${body} }).${name};`)(
    ...names.map((n) => globals[n]),
  );
}

const nocomment = (s) => s.replace(/\/\/[^\n]*/g, "");

// ── the chip carries the trigger ───────────────────────────────────────────

// The crumb-group literal, from its className down to its kids.
const GROUP = (() => {
  const at = SKEL.indexOf("className: `${pfx}__crumb-group`");
  assert.notEqual(at, -1, "the crumb group moved");
  return nocomment(SKEL.slice(at, SKEL.indexOf("workspaceSwitcher(pfx, ui)", at)));
})();

test("the chip is handed to the desk as a PART", () => {
  assert.match(GROUP, /sys_pn: "crumb-group"/);
  assert.match(GROUP, /partHandler: ui/);
});

test("it does NOT try to do it with a service", () => {
  // THE REPORTED BUG. A `service` here is raised by el.onclick, and every
  // widget between this box and the pointer binds one too — the breadcrumb
  // root, the menu root, and the menu's `.menu-trigger` part — each calling
  // stopPropagation in ui-core's __handleClick. A click on the caret or on the
  // workspace name never arrived; only the chip's bare padding did.
  assert.ok(
    !/service: "workspace-switcher"/.test(GROUP),
    "back on a service, which these clicks never reach",
  );
});

test("nothing in ui-core marks those middle widgets inert", () => {
  // The premise of the above. If the menu's trigger part ever stopped binding
  // a click, bubbling would work and the capture listener could go.
  const menuSkel = read(
    "node_modules/@drumee/ui-core/letc/widgets/menu/skeleton/index.js",
  );
  const at = menuSkel.indexOf("menu-trigger");
  assert.notEqual(at, -1);
  const trigger = menuSkel.slice(menuSkel.lastIndexOf("Skeletons.Box.X(", at), at + 300);
  assert.ok(!/active\s*:\s*0/.test(trigger), "the trigger part is inert now");
});

test("the breadcrumb inside it keeps its OWN handler", () => {
  // Deep crumbs must still navigate.
  assert.match(GROUP, /kind: "desk_breadcrumb"/);
  const bc = GROUP.slice(GROUP.indexOf('kind: "desk_breadcrumb"'));
  assert.match(bc, /uiHandler: \[ui\]/);
});

// ── the caret is drawn, not pressed ────────────────────────────────────────

const CARET = (() => {
  const at = SKEL.indexOf("className: `${pfx}__ws-btn`");
  assert.notEqual(at, -1, "the caret moved");
  const from = SKEL.lastIndexOf("trigger:", at);
  return nocomment(SKEL.slice(from, SKEL.indexOf("}),", at) + 3));
})();

test("the caret is inert", () => {
  assert.match(CARET, /active: 0/);
});

test("the caret has NO tooltip", () => {
  assert.ok(!/tooltips/.test(CARET), "the caret still carries a tooltip");
  // …and the tip class it used is gone from the skeleton's switcher entirely.
  const sw = nocomment(slice(SKEL, "function workspaceSwitcher(pfx, ui) {"));
  assert.ok(!/tooltips/.test(sw), "a tooltip survives elsewhere in the switcher");
});

test("the caret glyph itself is kept", () => {
  // The frame draws icon + name + caret; only the behaviour was removed.
  assert.match(CARET, /ico: "ph-caret-down"/);
});

// ── the toggle, run for real ───────────────────────────────────────────────

test("the chip part is bound as a capture listener", () => {
  const at = DESK.indexOf('case "crumb-group":');
  assert.notEqual(at, -1, "the chip part is not handled");
  assert.match(DESK.slice(at, at + 140), /this\._bindCrumbGroupTrigger\(child\)/);
  const bind = nocomment(slice(DESK, "  _bindCrumbGroupTrigger(child) {"));
  // `true` as the third argument IS the fix: capture runs root-down, before
  // any descendant's el.onclick can stopPropagation.
  assert.match(bind, /addEventListener\(\s*"click",[\s\S]*?true,\s*\)/);
});

test("the switcher part is held, because the chip is outside it", () => {
  const at = DESK.indexOf('case "wsmenu":');
  assert.notEqual(at, -1, "the switcher part is not cached");
  assert.match(DESK.slice(at, at + 120), /this\._wsSwitcher = child/);
});

const _ = require("underscore");
const A = new Proxy({}, { get: (_t, k) => String(k) });

/** The chip element, with a capture listener the test can fire. */
function chipEl() {
  const listeners = [];
  return {
    addEventListener(type, fn, capture) {
      listeners.push({ type, fn, capture });
    },
    __fire(target) {
      const e = {
        target,
        prevented: 0,
        stopped: 0,
        preventDefault() {
          this.prevented = 1;
        },
        stopPropagation() {
          this.stopped = 1;
        },
      };
      for (const l of listeners) if (l.type === "click") l.fn(e);
      return e;
    },
    get __capture() {
      return listeners.every((l) => l.capture === true);
    },
  };
}

/**
 * A DOM node inside the chip, described by the ancestors closest() can reach.
 * Ancestry is what the classifier reads, so the fake has to model it rather
 * than answer one selector.
 */
function node(ancestors = {}) {
  const el = {
    closest: (sel) => ancestors[sel] || null,
  };
  return el;
}

/** A crumb in the breadcrumb. */
function crumb({ current = 0, section = false } = {}) {
  const self = {
    dataset: { current: `${current}` },
    classList: {
      contains: (c) => section && c === "breadcrumb-item__main--section",
    },
  };
  return node({ ".breadcrumb-item__main": self });
}

/** Anything in the chip that is not a crumb and not the panel — the caret. */
const bare = () => node();

/** A control inside the OPEN switcher panel: the ⋯, a row, the pencil. */
const inPanel = (extra = {}) =>
  node({
    ".menu-topic-items__wrapper": {},
    ".desk-module-topbar__ws-menu": {},
    ...extra,
  });

function makeDesk({ state = 0, destroyed = false, section = false, menu = true } = {}) {
  const calls = { toggles: 0 };
  const globals = { _, _a: A };
  const widget = {
    el: {},
    isDestroyed: () => destroyed,
    mget: (k) => (k === "state" ? state : undefined),
    _triggerToggle() {
      calls.toggles++;
    },
  };
  const host = {
    _wsSwitcher: menu ? widget : null,
    el: {
      querySelector: (sel) => (section && /data-section='1'/.test(sel) ? {} : null),
    },
    _bindCrumbGroupTrigger: method(DESK, "  _bindCrumbGroupTrigger(child) {", globals),
    _crumbClickOpensSwitcher: method(DESK, "  _crumbClickOpensSwitcher(target) {", globals),
    _toggleWorkspaceSwitcher: method(DESK, "  _toggleWorkspaceSwitcher() {", globals),
  };
  const el = chipEl();
  host._bindCrumbGroupTrigger({ el });
  return { host, el, calls, widget };
}

test("a click on the CARET opens the switcher", () => {
  // The click the old service never saw.
  const d = makeDesk();
  const e = d.el.__fire(bare());
  assert.equal(d.calls.toggles, 1);
  assert.equal(e.stopped, 1, "the crumb underneath would answer it too");
  assert.equal(e.prevented, 1);
});

test("a click on the CURRENT crumb opens it too", () => {
  // Where the user already is, is not a destination — and with the address
  // showing just the workspace, that crumb IS the chip.
  const d = makeDesk();
  d.el.__fire(crumb({ current: 1 }));
  assert.equal(d.calls.toggles, 1);
});

test("a click on a crumb with somewhere to go NAVIGATES instead", () => {
  const d = makeDesk();
  const e = d.el.__fire(crumb({ current: 0 }));
  assert.equal(d.calls.toggles, 0, "the folder crumb no longer navigates");
  assert.equal(e.stopped, 0, "the crumb's own handler was cut off");
  assert.equal(e.prevented, 0);
});

test("a section label is chip, not destination — it carries no service", () => {
  const d = makeDesk({ section: false });
  d.el.__fire(crumb({ current: 0, section: true }));
  assert.equal(d.calls.toggles, 1);
});

test("the listener is registered for the CAPTURE phase", () => {
  const d = makeDesk();
  assert.ok(d.el.__capture, "bubble-phase again — the click never arrives");
});

test("binding twice does not stack listeners", () => {
  const d = makeDesk();
  d.host._bindCrumbGroupTrigger({ el: d.el });
  d.el.__fire(bare());
  assert.equal(d.calls.toggles, 1, "the chip toggles twice per click");
});

test("a part with no element is survived", () => {
  const globals = { _, _a: A };
  const bind = method(DESK, "  _bindCrumbGroupTrigger(child) {", globals);
  assert.doesNotThrow(() => bind.call({}, null));
  assert.doesNotThrow(() => bind.call({}, { el: null }));
  assert.doesNotThrow(() => bind.call({}, { el: {} }));
});

test("a section SCREEN offers nothing — the chip draws no control there", () => {
  // Settings / Get help / Plan / Trash…: the chip paints no ground (the
  // `:has()` rule in the skin) and there is no workspace to list.
  const d = makeDesk({ section: true });
  d.el.__fire(bare());
  assert.equal(d.calls.toggles, 0);
});

test("no switcher, or a destroyed one, is survived", () => {
  for (const opt of [{ menu: false }, { destroyed: true }]) {
    const d = makeDesk(opt);
    assert.doesNotThrow(() => d.el.__fire(bare()));
    assert.equal(d.calls.toggles, 0);
  }
});

test("it toggles — the widget decides open from closed", () => {
  // _triggerToggle reads the widget's own state. Nothing else answers this
  // click (the capture handler stops it), so no outside-close can race it.
  const open = makeDesk({ state: 1 });
  open.el.__fire(bare());
  assert.equal(open.calls.toggles, 1);
});

// ── the panel hangs off the chip ───────────────────────────────────────────

function rule(scss, selector) {
  const at = scss.indexOf(selector);
  assert.notEqual(at, -1, `${selector} not found`);
  const open = scss.indexOf("{", at);
  let depth = 0;
  for (let j = open; j < scss.length; j++) {
    if (scss[j] === "{") depth++;
    else if (scss[j] === "}" && --depth === 0) return scss.slice(at, j + 1);
  }
  assert.fail(`${selector} unbalanced`);
}

test("the CHIP is the positioning context", () => {
  const g = rule(SCSS, "&__crumb-group {");
  assert.match(nocomment(g), /position: relative;/);
});

test("…and the caret's wrapper has given it up", () => {
  // The pair of the rule above. A positioned wrapper here captures
  // .menu-topic-items__wrapper again and puts the panel back under the caret.
  const w = rule(SCSS, "&__ws-wrapper {");
  const stripped = nocomment(w);
  assert.match(stripped, /position: static;/);
  assert.ok(
    !/position: relative;\s*\n\s*flex: 0 0 auto/.test(stripped),
    "__ws-wrapper is positioned again",
  );
});

test("the panel still drops from left 0, below the whole chip", () => {
  const w = rule(SCSS, "&__ws-wrapper {");
  const inner = w.slice(w.indexOf(".menu-topic-items__wrapper"));
  const stripped = nocomment(inner);
  assert.match(stripped, /position: absolute;/);
  assert.match(stripped, /left: 0;/);
  // 100% is the CHIP's height now, so this clears the address rather than the
  // 16px caret.
  assert.match(stripped, /top: calc\(100% \+ 6px\);/);
});

test("the chip does not clip the panel it now hosts", () => {
  // 30px tall, and the panel is absolute inside it.
  const g = rule(SCSS, "&__crumb-group {");
  assert.match(nocomment(g), /overflow: visible;/);
});

// ── the panel inside the chip is not the chip ──────────────────────────────
//
// Reported: pressing the ⋯ in the open switcher opened no context menu and
// shut the switcher. The panel is absolutely positioned but still a DESCENDANT
// of __crumb-group, so every click in it passes through the capture listener,
// which was treating all of them as chip — swallowing the click and toggling
// the panel closed.

test("the ⋯ inside the panel is left alone", () => {
  const d = makeDesk();
  const e = d.el.__fire(inPanel({ ".desk-module-topbar__ws-head-action": {} }));
  assert.equal(d.calls.toggles, 0, "the chip handler closed the switcher");
  assert.equal(e.stopped, 0, "the ⋯ never received its own click");
  assert.equal(e.prevented, 0);
});

test("…and so is every other control in it", () => {
  // The rename pencil, the share link, a workspace row, "New workspaces".
  for (const cls of [
    ".desk-module-topbar__ws-head-name",
    ".desk-module-topbar__ws-row",
    ".desk-module-topbar__ws-new",
  ]) {
    const d = makeDesk();
    const e = d.el.__fire(inPanel({ [cls]: {} }));
    assert.equal(d.calls.toggles, 0, `${cls} closed the switcher`);
    assert.equal(e.stopped, 0, `${cls} never received its own click`);
  }
});

test("either spelling of the panel counts", () => {
  // The wrapper is ui-core's; __ws-menu is ours and is what the parts are fed
  // into. A fed part that ends up outside the wrapper is still panel.
  for (const sel of [".menu-topic-items__wrapper", ".desk-module-topbar__ws-menu"]) {
    const d = makeDesk();
    d.el.__fire(node({ [sel]: {} }));
    assert.equal(d.calls.toggles, 0, `${sel} was read as chip`);
  }
});

test("a crumb INSIDE the panel is panel, not a crumb", () => {
  // Order matters: the panel test runs first, so a row that happens to carry a
  // breadcrumb-ish class cannot be mistaken for the address.
  const d = makeDesk();
  d.el.__fire(
    inPanel({ ".breadcrumb-item__main": { dataset: { current: "1" }, classList: { contains: () => false } } }),
  );
  assert.equal(d.calls.toggles, 0);
});

test("the caret is NOT in the panel, so it still toggles", () => {
  // It lives in .menu-trigger, a sibling of the items wrapper — the one part of
  // the switcher widget that is chip.
  const d = makeDesk();
  d.el.__fire(node({ ".menu-trigger": {} }));
  assert.equal(d.calls.toggles, 1);
});

test("the ⋯ still raises its own service", () => {
  // What the capture handler must let through: _feedWorkspaceHead's button.
  const head = slice(DESK, "  _feedWorkspaceHead(head, rows, cur) {");
  assert.match(head, /service: "workspace-menu"/);
  assert.match(head, /__ws-head-action--more/);
});

test("the ⋯ is fed INTO the panel — the premise of all of this", () => {
  // ws-head is a kid of __ws-menu (desk/skeleton/topbar), and the header's
  // actions are fed into it, so the button is inside the dropdown.
  const sw = nocomment(slice(SKEL, "function workspaceSwitcher(pfx, ui) {"));
  const menuAt = sw.indexOf("__ws-menu");
  assert.notEqual(menuAt, -1);
  const headAt = sw.indexOf('sys_pn: "ws-head"');
  assert.ok(headAt > menuAt, "ws-head is no longer inside __ws-menu");
});

test("menu_topic would not close itself for a click inside its own root", () => {
  // The other half of "does not close the switcher", and it is ui-core's:
  // _onOutsideClick returns early when the click's currentTarget is inside the
  // menu element. If that guard ever goes, letting the click through here
  // stops being enough on its own.
  const core = read("node_modules/@drumee/ui-core/letc/widgets/menu/index.js");
  const at = core.indexOf("_onOutsideClick = ");
  assert.notEqual(at, -1);
  const body = core.slice(at, core.indexOf("RADIO_CLICK.on", at));
  assert.match(body, /this\.el\.contains\(e\.currentTarget\)/);
  assert.match(body, /this\.contains\(origin\)/);
});
