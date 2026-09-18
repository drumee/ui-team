// Only an Admin (or the Owner) may delete a workspace.
//
// Lexis, 2026-09-16: "member có permission là edit cũng đang delete được
// workspace". The Folder Setting panel's Delete row is the ONLY surface in the
// app that reaches confirmFolderDelete — the home-grid tile and the desk
// topbar ⋯ both route their "Move to trash" through Wm.removeMediaSelection,
// which buckets a hub the caller does not own into confirmLeaveHub. So this
// one row is the whole reported bug, and the row was gated on the WRITE bit:
// exactly what Edit holds.
//
// The panel half renders the REAL skeleton, so a row that loses or changes its
// `need` shows up here. The window half is one method inside a 7000-line class
// that needs the whole runtime to instantiate, so — as tests/rail-logo-home.js
// and tests/call-tile-drag.js do — it is cut out of the SOURCE FILE and run
// against a fake `this`. Both therefore test the shipped text, not a copy.
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { renderModule, walk } = require("./helpers/render-skeleton.js");

const PANEL =
  "src/drumee/builtins/window/folder/skeleton/settings-action-panel.js";
const WINDOW = resolve(__dirname, "../src/drumee/builtins/window/folder/index.js");
const src = readFileSync(WINDOW, "utf8");

// The stored privilege WORDS, weakest first — lex/constants.js `privilege`,
// which is what hub.set_privilege writes and what user_permission() hands back.
const VIEW = 0b0000011;
const CHAT = 0b0000111;
const EDIT = 0b0001111;
const ADMIN = 0b0011111;
const OWNER = 0b0111111;

// The single BITS the helpers test against — lex/constants.js `permission`.
const BIT = { download: 0b0000100, write: 0b0001000, admin: 0b0010000 };

// A folder window as the panel reads it. The three permission helpers are
// ui-core's (node_modules/@drumee/ui-core/letc/mfs.js) — reproduced here as the
// one-line bitmask tests they are, so a role is expressed as its privilege word
// and nothing else has to be stubbed.
function ui(privilege, over = {}) {
  return {
    fig: { family: "window-folder" },
    canDownload: () => privilege & BIT.download,
    canUpload: () => privilege & BIT.write,
    canAdmin: () => privilege & BIT.admin,
    // The members matrix: empty is the honest default here. hub.get_members_by_type
    // does not exist in a drumate DB (schemas templates/factory/drumate.sql), so
    // a PERSONAL workspace always renders this panel with no rows — which is
    // precisely why the Delete gate must not be read off the matrix.
    _folderMembers: [],
    _folderMembersLoaded: true,
    _folderInviteRole: null,
    ...over,
  };
}

const servicesOf = (tree) => {
  const out = [];
  for (const n of walk(tree)) if (n && n.service) out.push(n.service);
  return out;
};

const actionsFor = (privilege, over) =>
  servicesOf(renderModule(PANEL, ui(privilege, over))).filter((s) =>
    /^(folder-(rename|organize|duplicate|delete)|download)$/.test(s),
  );

// ── the panel ───────────────────────────────────────────────────────────────

test("Edit is offered every write action EXCEPT Delete", () => {
  const rows = actionsFor(EDIT);
  assert.ok(rows.includes("folder-rename"), "Edit lost Rename");
  assert.ok(rows.includes("folder-organize"), "Edit lost Organize");
  assert.ok(rows.includes("folder-duplicate"), "Edit lost Duplicate");
  assert.ok(rows.includes("download"), "Edit lost Download");
  assert.ok(
    !rows.includes("folder-delete"),
    "THE BUG: an Edit member is still offered Delete",
  );
});

test("Admin and Owner keep Delete", () => {
  for (const [name, priv] of [["admin", ADMIN], ["owner", OWNER]]) {
    assert.ok(
      actionsFor(priv).includes("folder-delete"),
      `${name} must still be able to delete the workspace`,
    );
  }
});

test("View and Chat are unchanged — they never had Delete", () => {
  // Chat carries the download bit and nothing above it; View carries neither.
  assert.deepEqual(actionsFor(CHAT), ["download"]);
  assert.deepEqual(actionsFor(VIEW), []);
});

test("an unreadable privilege fails OPEN, as every other row does", () => {
  // A window whose privilege never arrived (a folder opened from a meeting
  // notification, say) must not lock its OWNER out. The rule is about the
  // METHOD being missing, not about the bitmask reading 0 — a 0 is an answer.
  const bare = { fig: { family: "window-folder" }, _folderMembers: [] };
  const rows = servicesOf(renderModule(PANEL, bare));
  assert.ok(rows.includes("folder-delete"));

  const throws = ui(OWNER, {
    canAdmin: () => {
      throw new Error("privilege unreadable");
    },
  });
  assert.ok(servicesOf(renderModule(PANEL, throws)).includes("folder-delete"));
});

test("the Delete row declares `admin`, and it is the only row that does", () => {
  const panel = readFileSync(resolve(__dirname, "..", PANEL), "utf8");
  const needs = [...panel.matchAll(/service: "(folder-[a-z]+)"[\s\S]{0,200}?need: "(\w+)"/g)]
    .map((m) => [m[1], m[2]]);
  const admin = needs.filter(([, n]) => n === "admin").map(([s]) => s);
  assert.deepEqual(admin, ["folder-delete"]);
});

// ── the window ──────────────────────────────────────────────────────────────

// One class method lifted out of index.js. It closes at the first line that is
// exactly "  }" — nothing inside it is indented that shallowly — so the slice
// is unambiguous.
function grab(name) {
  const start = src.indexOf(`  ${name}(`);
  assert.ok(start > 0, `${name} not found in ${WINDOW}`);
  const end = src.indexOf("\n  }\n", start) + 4;
  assert.ok(end > start, `${name} has no end`);
  return src.slice(start, end);
}

const may = new Function(`return { ${grab("_mayDeleteWorkspace")} };`)()
  ._mayDeleteWorkspace;

test("_mayDeleteWorkspace answers the admin bit", () => {
  for (const [name, priv, want] of [
    ["view", VIEW, false],
    ["chat", CHAT, false],
    ["edit", EDIT, false],
    ["admin", ADMIN, true],
    ["owner", OWNER, true],
  ]) {
    assert.equal(
      may.call({ canAdmin: () => priv & BIT.admin }),
      want,
      `${name} (${priv}) got the wrong answer`,
    );
  }
});

test("_mayDeleteWorkspace fails open on a missing or throwing helper", () => {
  assert.equal(may.call({}), true);
  assert.equal(
    may.call({
      canAdmin: () => {
        throw new Error("nope");
      },
    }),
    true,
  );
});

test("confirmFolderDelete refuses before it resolves anything", () => {
  // The guard has to come FIRST: everything below it reads the workspace and
  // hands it to Wm, and a check placed after that would be racing a request
  // that is already on its way.
  const body = grab("confirmFolderDelete");
  const guard = body.indexOf("_mayDeleteWorkspace");
  assert.ok(guard > 0, "confirmFolderDelete no longer checks _mayDeleteWorkspace");
  for (const call of ["confirmRemoveWorkspace", "confirmRemovePersonalWorkspace"]) {
    const at = body.indexOf(call);
    assert.ok(at > guard, `${call} is reachable before the admin check`);
  }
});
