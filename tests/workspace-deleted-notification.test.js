// "<Somebody> deleted your workspace '<name>'" — the row the OWNER sees after
// an admin destroys their workspace (Duy, 2026-09-17; server writes it in
// hub.delete_hub via _notifyOwnerOfDeletion).
//
// THE ROW THIS PANEL COULD NOT DRAW. A yp.contact_activity row reaches the
// client from activity_get_feed_all with `category` NULL and `event_type`
// 'contact', and the renderer resolves a row's category as
// `category || event_type || type` — so an unhandled one renders as the CONTACT
// branch, "wants to connect". That is the defect Lexis reported for workspace
// invitations on 2026-09-14, and this event would have repeated it. The server
// stamps `category: 'workspace_deleted'`; these tests hold the client's half of
// that contract.
//
// The copy half renders the REAL skeleton. The routing half slices the shipped
// click handler's source, because the widget needs the whole runtime to build.
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { renderModule, walk } = require("./helpers/render-skeleton.js");

const SKELETON = "src/drumee/builtins/panel/activity/widget/item/skeleton/index.js";
const ITEM = resolve(__dirname, "../src/drumee/builtins/panel/activity/widget/item/index.js");
const PANEL = resolve(__dirname, "../src/drumee/builtins/panel/activity/index.js");
const SKIN = resolve(__dirname, "../src/drumee/builtins/panel/activity/widget/item/skin/index.scss");

// A stamped row as the server now delivers it.
const row = (over = {}) => ({
  id: 41,
  uid: "adminuid",
  author_id: "adminuid",
  event: "workspace_deleted",
  event_type: "contact",
  category: "workspace_deleted",
  hub_id: null,
  firstname: "Ada",
  lastname: "Lovelace",
  hub_name: "Design team",
  deleted_by: "Ada Lovelace",
  timestamp: 1758000000,
  ...over,
});

// The widget the skeleton reads. It takes ONLY `ui` and pulls the row out of
// `ui.model.toJSON()`, so the stub has to offer both that and mget.
const ui = (data) => ({
  fig: { family: "activity-item" },
  model: { toJSON: () => data },
  mget: (k) => data[k],
  getItemName: () => data.hub_name || "",
  _id: "1",
});

// The sentence is one HTML string on a single Note (the skeleton builds it that
// way), and the harness's LOCALE is a Proxy that echoes the KEY — so a branch
// using LOCALE.FOO surfaces here as the literal "FOO". That is what makes the
// first test below meaningful: it proves the copy comes from LOCALE rather than
// a hardcoded English string. The wording itself is checked against en.json.
const textOf = (tree) => {
  let out = "";
  for (const n of walk(tree)) if (n && typeof n.content === "string") out += n.content;
  return out;
};

const en = JSON.parse(
  readFileSync(resolve(__dirname, "..", "locale", "en.json"), "utf8"),
);

const render = (data) => renderModule(SKELETON, ui(data));

// ── the copy ────────────────────────────────────────────────────────────────

test("it says the workspace was deleted, not that somebody wants to connect", () => {
  const text = textOf(render(row()));
  assert.match(text, /DELETED_YOUR_WORKSPACE/, "the copy does not come from LOCALE");
  assert.match(en.DELETED_YOUR_WORKSPACE, /deleted your workspace/i);
  assert.ok(
    !/WANTS_TO_CONNECT|wants to connect/i.test(text),
    "THE BUG: an unhandled contact_activity event renders as a contact request",
  );
});

test("the workspace name is quoted, and comes off the row", () => {
  // It can only come off the row: yp.hub lost its row when the workspace went,
  // so `hub_name` is a snapshot the server took at delete time.
  // escapeHtml turns the quotes into entities on the way into the sentence.
  assert.match(textOf(render(row())), /&#39;Design team&#39;/);
});

test("a name that could not be resolved leaves no empty quotes", () => {
  const text = textOf(render(row({ hub_name: "" })));
  assert.match(text, /DELETED_YOUR_WORKSPACE/);
  assert.ok(
    !/&#39;&#39;/.test(text),
    "an empty pair of quotes reads as a rendering bug",
  );
});

test("the name is handed over RAW — the renderer escapes it once", () => {
  // meta.label goes through escapeHtml when the sentence is built, so escaping
  // in the branch would double-encode: "R&D" would read "R&amp;D".
  const src = readFileSync(resolve(__dirname, "..", SKELETON), "utf8");
  const branch = src.slice(src.indexOf("case 'workspace_deleted'"));
  const body = branch.slice(0, branch.indexOf("case 'contact_refused'"));
  assert.ok(!/escapeHtml\(ws\)/.test(body), "double-escapes the workspace name");
});

// ── the row leads nowhere, and says so ──────────────────────────────────────

test("the row is marked inert so it does not promise a destination", () => {
  const tree = render(row());
  const card = [...walk(tree)].find(
    (n) => typeof n.className === "string" && n.className.includes("__row"),
  );
  assert.ok(card, "row card not rendered");
  assert.equal(card.dataset.inert, 1);
});

test("an ordinary row is NOT marked inert", () => {
  const tree = render(row({ event: "hub_invite_received", category: "hub_invite" }));
  const card = [...walk(tree)].find(
    (n) => typeof n.className === "string" && n.className.includes("__row"),
  );
  assert.equal(card.dataset.inert, 0);
});

test("the skin drops the pointer cursor for an inert row", () => {
  const skin = readFileSync(SKIN, "utf8");
  assert.match(skin, /&\[data-inert="1"\]\s*\{\s*[^}]*cursor:\s*default/);
});

test("the click marks it read and navigates nowhere", () => {
  const src = readFileSync(ITEM, "utf8");
  const at = src.indexOf("if (this.mget('event') === 'workspace_deleted')");
  assert.ok(at > 0, "the workspace_deleted click branch is gone");
  const branch = src.slice(at, src.indexOf("\n    }", at) + 6);
  assert.match(branch, /service: 'read-activity'/, "the badge could never be cleared");
  assert.ok(!/location\.hash/.test(branch), "a deleted workspace has nowhere to open");
});

test("the guard runs BEFORE any branch that navigates", () => {
  const src = readFileSync(ITEM, "utf8");
  const guard = src.indexOf("if (this.mget('event') === 'workspace_deleted')");
  // The category switch's arms build `#/desk/wm/reveal/?hub_id=…` hashes; with
  // no hub_id that is a broken route, so the guard must come first.
  const sw = src.indexOf("switch (category) {", guard);
  assert.ok(guard > 0 && sw > guard, "workspace_deleted can fall into a navigating branch");
});

// ── dismissal addresses the right table ─────────────────────────────────────

test("read and trash route through the contact_activity endpoints", () => {
  // Its category is 'workspace_deleted', so without being named here it would
  // fall past every branch to the mfs path and dismiss a changelog id that does
  // not exist — the row would reappear on the next reload.
  const src = readFileSync(PANEL, "utf8");
  const at = src.indexOf("itemType === 'hub_invite'");
  assert.ok(at > 0);
  const line = src.slice(at, src.indexOf("{", at));
  assert.match(line, /itemType === 'workspace_deleted'/);
});

// ── the copy exists in every language ───────────────────────────────────────

test("DELETED_YOUR_WORKSPACE is translated everywhere", () => {
  for (const lang of ["en", "es", "fr", "km", "ru", "zh"]) {
    const dict = JSON.parse(
      readFileSync(resolve(__dirname, "..", "locale", `${lang}.json`), "utf8"),
    );
    const v = dict.DELETED_YOUR_WORKSPACE;
    assert.ok(v && `${v}`.trim(), `${lang}.json is missing DELETED_YOUR_WORKSPACE`);
  }
});
