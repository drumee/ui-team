#!/usr/bin/env node

/**
 * `removeContent`'s "am I inside what was just deleted?" test.
 *
 * This method runs for EVERY open window on EVERY delete echo, and its own
 * docblock records an incident where it destroyed the desk's whole work area.
 * So its predicate is unit-tested here rather than reasoned about.
 *
 * THREE DEFECTS IT USED TO HAVE, each on its own enough to leave a deleted
 * workspace's pane alive (reported: after deleting "test(1)" the breadcrumb,
 * the wm-container and the next page load all still showed it):
 *
 *   1. `let path = this.mget(_a.filepath)` is UNDEFINED on a headless
 *      workspace pane. The pane is fed from media.attributes → mfs_node_attr,
 *      whose column is `file_path`; only mfs_show_node_by emits `filepath`,
 *      which is why grid tiles closed correctly and the pane never did.
 *   2. `path != "/"` excluded it anyway — a workspace root's own path IS "/".
 *   3. `new RegExp("^" + filepath)` was unescaped. "/test(1)" compiles to
 *      /^\/test(1)/, which matches "/test1" and NOT "/test(1)"; an unbalanced
 *      bracket ("test)") THROWS SyntaxError and aborts the whole echo.
 *
 * The regex also matched too much even when it compiled: "^/a" matches "/abc",
 * so deleting /a would close a window sitting in an unrelated /abc.
 *
 * Run from ui-team with:
 *   node --test tests/window-remove-content-path.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const read = (p) => readFileSync(join(REPO_ROOT, p), "utf8");
const UTILS = read("src/drumee/builtins/window/utils.js");

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

const A = {
  filepath: "filepath",
  file_path: "file_path",
  ownpath: "ownpath",
  hub_id: "hub_id",
  filetype: "filetype",
  nid: "nid",
  pid: "pid",
  hub: "hub",
};

const isUnder = method(UTILS, "_pathIsUnder(path, ancestor) {", {
  _: require("underscore"),
});

// ── the path predicate ─────────────────────────────────────────────────────

test("a path is under itself", () => {
  assert.equal(isUnder("/test(1)", "/test(1)"), true);
  assert.equal(isUnder("/", "/"), true);
});

test("regex metacharacters in a name are literal, not patterns", () => {
  // The reported workspace. /^\/test(1)/ matched "/test1" and missed this.
  assert.equal(isUnder("/test(1)", "/test(1)"), true);
  assert.equal(isUnder("/test1", "/test(1)"), false, "the old regex matched this");
  for (const name of ["/a.b", "/x+y", "/w[1]", "/q?", "/m*", "/d$", "/c^", "/e|f"]) {
    assert.equal(isUnder(name, name), true, `${name} must match itself`);
  }
});

test("an unbalanced bracket does not throw", () => {
  // new RegExp("^/test)") threw SyntaxError and aborted the echo for every
  // open window, not just this one.
  assert.doesNotThrow(() => isUnder("/test)", "/test)"));
  assert.equal(isUnder("/test)", "/test)"), true);
  assert.doesNotThrow(() => isUnder("/a(b", "/a(b"));
  assert.equal(isUnder("/a(b", "/a(b"), true);
});

test("a descendant is under its ancestor", () => {
  assert.equal(isUnder("/a/b", "/a"), true);
  assert.equal(isUnder("/a/b/c", "/a"), true);
  assert.equal(isUnder("/a/b", "/a/b"), true);
});

test("a SIBLING sharing a prefix is NOT under it", () => {
  // "^/a" matched "/abc". Deleting /a would have closed a window in /abc.
  assert.equal(isUnder("/abc", "/a"), false);
  assert.equal(isUnder("/testing", "/test"), false);
});

test("everything is under the root", () => {
  assert.equal(isUnder("/a/b", "/"), true);
  assert.equal(isUnder("/", "/"), true);
});

test("a trailing slash on either side does not change the answer", () => {
  assert.equal(isUnder("/a/b/", "/a"), true);
  assert.equal(isUnder("/a/b", "/a/"), true);
});

test("missing or empty input is never 'under'", () => {
  assert.equal(isUnder(undefined, "/a"), false);
  assert.equal(isUnder("/a", undefined), false);
  assert.equal(isUnder("", "/a"), false);
  assert.equal(isUnder("/a", ""), false);
  assert.equal(isUnder(null, null), false);
});

// ── removeContent, driven with the real echo ───────────────────────────────
//
// The echo confirmRemoveHub sends is
//   {...media.getAttr(), hub_id, home_id: hub_id, nid: hub_id, filetype: 'hub'}
// where the media is the hub's PLACEHOLDER TILE in the user's home — so its
// filepath is "/test(1)", while a window showing that workspace sits at the
// root INSIDE the hub, whose path is "/". Two unrelated strings: the prefix
// test cannot decide this case, which is why hub_id + filetype does.

const removeContent = method(UTILS, "removeContent(args) {", {
  _: require("underscore"),
  _a: A,
  Wm: { alert() {} },
});

/** A window under test. `attrs` is its model. */
function win(attrs) {
  const w = {
    goodbyes: 0,
    _attrs: attrs,
    mget: (k) => attrs[k],
    goodbye() {
      w.goodbyes++;
    },
    updateInnerHubsPreview() {},
    getItemsByAttr: () => [],
    getCurrentNid: () => "CUR",
    _pathIsUnder: isUnder,
    _ownPath: method(UTILS, "_ownPath() {", { _a: A }),
  };
  // removeContent recurses through `this.removeContent` for an array echo.
  w.removeContent = removeContent;
  return w;
}

const HUB = "b5d38adab5d38ade";
/** The echo for deleting workspace "test(1)". */
const HUB_ECHO = {
  hub_id: HUB,
  home_id: HUB,
  nid: HUB,
  filetype: "hub",
  filepath: "/test(1)",
};

test("the headless workspace pane closes when its hub is deleted", () => {
  // Fed from media.attributes: `file_path`, NOT `filepath`, and it is "/".
  const pane = win({ hub_id: HUB, file_path: "/", headless: 1 });
  removeContent.call(pane, HUB_ECHO);
  assert.equal(
    pane.goodbyes,
    1,
    "this is the reported bug — the pane stayed mounted, which kept "
      + "_curWorkspace set, the breadcrumb populated and the state persisted",
  );
});

test("a window in ANOTHER hub is untouched", () => {
  const other = win({ hub_id: "OTHERHUB", file_path: "/" });
  removeContent.call(other, HUB_ECHO);
  assert.equal(other.goodbyes, 0);
});

test("a subfolder window of the deleted hub closes too", () => {
  const sub = win({ hub_id: HUB, filepath: "/sub/deep" });
  removeContent.call(sub, HUB_ECHO);
  assert.equal(sub.goodbyes, 1);
});

test("Wm itself is never closed by a content event", () => {
  // The docblock records this: Wm carries a hub_id and a filepath of its own,
  // so all three tests once passed for Wm and it called goodbye() on itself,
  // destroying the desk's work area.
  const globals = {
    _: require("underscore"),
    _a: A,
    Wm: null,
  };
  const wm = win({ hub_id: HUB, filepath: "/test(1)/x" });
  globals.Wm = wm;
  const rc = method(UTILS, "removeContent(args) {", globals);
  rc.call(wm, HUB_ECHO);
  assert.equal(wm.goodbyes, 0, "Wm is the container windows live in");
});

test("a FILE delete does not close a window at the hub root", () => {
  const pane = win({ hub_id: HUB, file_path: "/" });
  removeContent.call(pane, {
    hub_id: HUB,
    nid: "somefile",
    filetype: "document",
    filepath: "/a/file.txt",
  });
  assert.equal(pane.goodbyes, 0, "only the hub echo takes the whole window");
});

test("deleting /a does not close a window in /abc", () => {
  const w = win({ hub_id: HUB, filepath: "/abc" });
  removeContent.call(w, {
    hub_id: HUB,
    nid: "n",
    filetype: "folder",
    filepath: "/a",
  });
  assert.equal(w.goodbyes, 0, "the old ^-prefix regex closed this");
});

test("deleting a folder whose name has regex syntax closes windows inside it", () => {
  const w = win({ hub_id: HUB, filepath: "/test(1)/inner" });
  removeContent.call(w, {
    hub_id: HUB,
    nid: "n",
    filetype: "folder",
    filepath: "/test(1)",
  });
  assert.equal(w.goodbyes, 1, "/^\\/test(1)/ never matched this");
});

test("an unbalanced bracket in a deleted name does not throw", () => {
  const w = win({ hub_id: HUB, filepath: "/x" });
  assert.doesNotThrow(() =>
    removeContent.call(w, {
      hub_id: HUB,
      nid: "n",
      filetype: "folder",
      filepath: "/test)",
    }),
  );
});

test("an array echo is handled item by item", () => {
  const pane = win({ hub_id: HUB, file_path: "/" });
  removeContent.call(pane, [
    { hub_id: "OTHER", nid: "x", filetype: "document", filepath: "/f" },
    HUB_ECHO,
  ]);
  assert.equal(pane.goodbyes, 1);
});

// ── the path field has three spellings ─────────────────────────────────────
//
// A hub echo is decided by hub_id + filetype, so it never reaches the path
// test. What DOES reach it is a folder delete — and a window fed from
// media.attributes (mfs_node_attr) has `file_path`, never `filepath`, so
// reading only `_a.filepath` leaves it undefined and the window stays open on
// a folder that no longer exists.

test("a window carrying only file_path still closes on a folder delete", () => {
  const w = win({ hub_id: HUB, file_path: "/team/notes" });
  removeContent.call(w, {
    hub_id: HUB,
    nid: "n",
    filetype: "folder",
    filepath: "/team",
  });
  assert.equal(
    w.goodbyes,
    1,
    "mget(_a.filepath) is undefined here — only mfs_show_node_by emits that key",
  );
});

test("a window carrying only ownpath closes too", () => {
  const w = win({ hub_id: HUB, ownpath: "/team/notes" });
  removeContent.call(w, {
    hub_id: HUB,
    nid: "n",
    filetype: "folder",
    filepath: "/team",
  });
  assert.equal(w.goodbyes, 1, "loadWorkspace sets ownpath, the third spelling");
});

test("filepath wins when more than one spelling is present", () => {
  // Inside /a, not inside /b — the authoritative field must be the one used.
  const w = win({ hub_id: HUB, filepath: "/a/x", file_path: "/b/x" });
  removeContent.call(w, {
    hub_id: HUB,
    nid: "n",
    filetype: "folder",
    filepath: "/b",
  });
  assert.equal(w.goodbyes, 0, "file_path must not override filepath");
});

test("a window with NO path at all is left alone on a folder delete", () => {
  const w = win({ hub_id: HUB });
  assert.doesNotThrow(() =>
    removeContent.call(w, {
      hub_id: HUB,
      nid: "n",
      filetype: "folder",
      filepath: "/team",
    }),
  );
  assert.equal(w.goodbyes, 0, "unknown location is not grounds for closing");
});
