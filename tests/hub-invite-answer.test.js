// "<invitee> accepted / declined your invitation to <workspace>" for the admin
// who sent a workspace invitation (Lexis, 2026-11-02). server-team writes the
// row (lib/hub-invite-answer-notify) and stamps category = the event; this
// checks the panel renders, routes, reads and refreshes it.
//
//   node --test tests/hub-invite-answer.test.js
//
// The skeleton's case is sliced from the real source and executed, so a change
// there is what gets tested.
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const ROOT = resolve(__dirname, "..");
const read = (f) => readFileSync(resolve(ROOT, f), "utf8");
const ITEM = read("src/drumee/builtins/panel/activity/widget/item/index.js");
const SKEL = read("src/drumee/builtins/panel/activity/widget/item/skeleton/index.js");
const PANEL = read("src/drumee/builtins/panel/activity/index.js");
const LANGS = ["en", "fr", "es", "ru", "zh", "km"];

// The `case 'hub_invite_accepted': case 'hub_invite_declined': { ... }` block.
function sliceCase(src) {
  const start = src.indexOf("case 'hub_invite_accepted':");
  assert.ok(start >= 0, "case not found");
  const open = src.indexOf("{", src.indexOf("case 'hub_invite_declined':", start));
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(start, i + 1);
  }
  throw new Error("unbalanced case");
}

function renderMeta(category, data) {
  const en = JSON.parse(read("locale/en.json"));
  const run = new Function(
    "ui", "data", "LOCALE", "_a", "BADGE",
    `switch (ui.mget(_a.category)) {\n${sliceCase(SKEL)}\n}\nreturn null;`
  );
  const ui = { mget: (k) => (k === "category" ? category : undefined) };
  return run(ui, data, en, { category: "category" }, { success: "success", error: "error", brand: "brand" });
}

test("accepted: '<X> accepted your invitation to <workspace>', success tone", () => {
  const m = renderMeta("hub_invite_accepted", { hub_name: "Marketing" });
  assert.strictEqual(m.before, "accepted your invitation to ");
  assert.strictEqual(m.label, "Marketing");
  assert.strictEqual(m.ico, "noti-check-circle");
  assert.strictEqual(m.tone, "success");
});

test("declined: '<X> declined your invitation to <workspace>', error tone", () => {
  const m = renderMeta("hub_invite_declined", { hub_name: "Marketing" });
  assert.strictEqual(m.before, "declined your invitation to ");
  assert.strictEqual(m.label, "Marketing");
  assert.strictEqual(m.ico, "noti-x-circle");
  assert.strictEqual(m.tone, "error");
});

test("no workspace name: an empty label, never the sender / name chain", () => {
  assert.strictEqual(renderMeta("hub_invite_accepted", {}).label, "");
});

test("both keys exist, non-empty, in every language", () => {
  for (const lang of LANGS) {
    const l = JSON.parse(read(`locale/${lang}.json`));
    assert.ok(l.HUB_INVITE_ACCEPTED_ACTION, `${lang} accepted`);
    assert.ok(l.HUB_INVITE_DECLINED_ACTION, `${lang} declined`);
  }
});

test("read / removed by id like every contact_activity row", () => {
  assert.match(ITEM, /isHubInviteAnswerCategory\(opt\.category\) \? 'contact_invite'/);
  // dismiss (trash) path
  assert.match(ITEM, /case 'hub_invite_accepted':\s*case 'hub_invite_declined':\s*this\.triggerHandlers\(\{ service: 'dismiss-activity', item_type, item_key \}\)/);
});

test("click opens the workspace and reads the row", () => {
  const i = ITEM.lastIndexOf("case 'hub_invite_accepted':");
  const block = ITEM.slice(i, ITEM.indexOf("break;", i));
  assert.match(block, /service: 'read-activity', hub_id, item_type, item_key/);
  assert.match(block, /#\/desk\/wm\/reveal\/\?hub_id=\$\{hub_id\}&nid=0&filetype=folder&pid=0/);
});

test("the inviter's panel refreshes on the push", () => {
  assert.match(PANEL, /case "activity\.hub_invite_answer":/);
});
