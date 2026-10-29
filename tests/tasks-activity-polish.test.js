// tests/tasks-activity-polish.test.js — QA pass on the Activity section
// (2026-10-27): black connector, primary focus ring on the comment editor, no
// rail on the detail sidebar, newest-first activity, one icon size per toolbar,
// and a loading state while a comment is being sent or saved.
//
//   node --test tests/tasks-activity-polish.test.js
//
// Compiles the REAL tasks skin, runs the REAL sort helper and the REAL
// _submitComment / _saveCommentEdit against stubs, and reads the skeleton
// source where it only loads under webpack.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sass = require("sass");
const { sliceFunction } = require("./helpers/slice-method");

const ROOT = path.join(__dirname, "..");
const DIR = path.join(ROOT, "src/drumee/builtins/window/tasks");
const src = fs.readFileSync(path.join(DIR, "index.js"), "utf8");
const skel = fs.readFileSync(path.join(DIR, "skeleton/index.js"), "utf8");
const sprite = fs.readFileSync(path.join(ROOT, "icons/sprites/normalized.sprite.svg"), "utf8");
const css = sass.compile(path.join(DIR, "skin/index.scss"), {
  loadPaths: [path.join(ROOT, "src/drumee"), path.join(ROOT, "src/drumee/skin"), path.join(ROOT, "skin")],
  style: "compressed",
  logger: sass.Logger.silent,
}).css;

global.LOCALE = {};
global.Skeletons = { Box: {}, Note: () => ({}), Image: {}, Button: {} };
const { newestFirst } = require(path.join(DIR, "skeleton/helpers.js"));

// Compressed output unquotes identifier attribute values but keeps numeric
// ones quoted, so compare unquoted.
const unq = (x) => x.replace(/="([A-Za-z_][\w-]*)"\]/g, "=$1]");
function declsFor(sel) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    if (m[1].split(",").map((x) => unq(x.trim())).includes(unq(sel))) out.push(m[2]);
  }
  return out.join(";");
}
const P = ".tasks-panel";

test("the thread connector is drawn in the text colour (black on light)", () => {
  assert.match(css, /\.tasks-panel__comment-thread\[data-has-replies="1"\]::before\{[^}]*border-left:1px solid var\(--normal-fg-10, ?#0b0a21\)/);
  assert.doesNotMatch(css, /--col-primary-20/);
});

test("the comment editor's focus border is the primary colour", () => {
  assert.match(declsFor(`${P}__comment-input:focus`), /border-color:var\(--col-primary-40, ?#5950ff\)/);
});

test("the detail sidebar has no left rail", () => {
  assert.doesNotMatch(declsFor(`${P}__detail-panel ${P}__modal-side`), /border-left/);
});

test("newestFirst sorts by ctime, newest first, without mutating", () => {
  const rows = [{ id: "a", ctime: 10 }, { id: "b", ctime: 30 }, { id: "c" }, { id: "d", ctime: "20" }];
  const out = newestFirst(rows);
  assert.deepEqual(out.map((r) => r.id), ["b", "d", "a", "c"]);
  assert.deepEqual(rows.map((r) => r.id), ["a", "b", "c", "d"]);
  assert.deepEqual(newestFirst(null), []);
});

test("comment threads and the change log are both listed newest first", () => {
  const body = (name) => skel.slice(skel.indexOf(`function ${name}(`), skel.indexOf("\n}\n", skel.indexOf(`function ${name}(`)));
  assert.match(body("buildCommentListContent"), /newestFirst\(/);
  assert.match(body("buildHistoryListContent"), /newestFirst\(/);
  assert.doesNotMatch(body("buildCommentListContent"), /a\.ts - b\.ts/);
});

test("composer tools are Phosphor icons of one family, no text '@'", () => {
  for (const id of ["ph-paperclip", "ph-at", "ph-paper-plane-right"]) {
    assert.ok(sprite.includes(`id="--icon-${id}"`), id);
  }
  const tools = skel.slice(skel.indexOf("function composerTools("), skel.indexOf("\n}\n", skel.indexOf("function composerTools(")));
  assert.match(tools, /ico: "ph-paperclip"/);
  assert.match(tools, /ico: "ph-at"/);
  assert.doesNotMatch(tools, /content: "@"/);
  assert.doesNotMatch(skel, /ico: "app-send"/);
  assert.equal((skel.match(/ico: "ph-paper-plane-right"/g) || []).length, 2);
});

test("one icon size per toolbar: 20px in the composers, 16px in a comment's actions", () => {
  for (const sel of [`${P}__composer-ico`, `${P}__composer-send`, `${P}__comment-reply-send`]) {
    assert.match(declsFor(sel), /width:20px;height:20px/, sel);
    assert.match(declsFor(`${sel} svg`), /width:20px;height:20px/, `${sel} svg`);
  }
  assert.match(declsFor(`${P}__comment-actions ${P}__composer-ico`), /width:16px;height:16px/);
  assert.match(declsFor(`${P}__comment-actions ${P}__composer-ico svg`), /width:16px;height:16px/);
});

test("a sending composer spins its send icon and takes no input", () => {
  const send = `${P}__comment-composer[data-loading="1"] ${P}__composer-send`;
  assert.match(declsFor(`${send}::after`), /animation:tasks-panel-spin/);
  assert.match(declsFor(`${send} svg`), /visibility:hidden/);
  const field = declsFor(`${P}__comment-composer[data-loading="1"] ${P}__comment-field`);
  assert.match(field, /pointer-events:none/);
  assert.match(field, /opacity:/);
});

test("an edit being saved dims its editor and takes no input", () => {
  const d = declsFor(`${P}__comment-edit-input[data-loading="1"]`);
  assert.match(d, /pointer-events:none/);
  assert.match(d, /opacity:/);
});

// ── _submitComment / _saveCommentEdit against stubs ──────────────────────
global.SERVICE = { task: { comment_create: "task.comment_create", comment_update: "task.comment_update" } };
global.Visitor = { id: "u1" };
// eslint-disable-next-line no-eval
const submitComment = eval(`(${sliceFunction(src, "async _submitComment()")})`);
// eslint-disable-next-line no-eval
const saveCommentEdit = eval(`(${sliceFunction(src, "async _saveCommentEdit()")})`);
// eslint-disable-next-line no-eval
const markLoading = eval(`(${sliceFunction(src, "_markLoading(part, busy)")})`);

function panel() {
  const nodes = {};
  const node = (sel) => (nodes[sel] = nodes[sel] || { sel, dataset: {}, textContent: "" });
  let release;
  const s = {
    fig: { family: "tasks-panel" },
    _detailId: 7,
    _hubId: "h",
    _comments: [],
    posts: 0,
    el: { querySelector: (sel) => node(sel) },
    nodes,
    gate: new Promise((r) => (release = r)),
    release: () => release(),
    postService() {
      s.posts++;
      return s.gate.then(() => [{ id: 99 }]);
    },
    _markLoading: markLoading,
    _setControlBusy(el, busy) {
      if (el) el.dataset.loading = busy ? "1" : "0";
    },
    _refreshCommentList() {},
    _refreshPendingList() {},
    _descEditorEl: () => null,
    _renderEditorContent() {},
    _replaceComment() {},
    _loadComments: () => Promise.resolve(),
    _linkCommentFiles: () => Promise.resolve({ failed: 0 }),
  };
  return s;
}

test("sending a comment marks the composer loading until the server answers, and posts once", async () => {
  const s = panel();
  s._commentDraft = { body: "hi", mention_uids: [] };
  const run = submitComment.call(s);
  const composer = s.nodes[".tasks-panel__comment-composer"];
  assert.equal(composer && composer.dataset.loading, "1");
  s._commentDraft = { body: "again", mention_uids: [] };
  await submitComment.call(s); // a second Enter while the first is in flight
  assert.equal(s.posts, 1);
  s.release();
  await run;
  assert.equal(composer.dataset.loading, "0");
});

test("saving an edit marks the edit input loading until the server answers", async () => {
  const s = panel();
  s._editingCommentId = 5;
  s._commentEditDraft = { body: "edited", mention_uids: [] };
  const run = saveCommentEdit.call(s);
  const input = s.nodes[".tasks-panel__comment-edit-input"];
  assert.equal(input && input.dataset.loading, "1");
  s.release();
  await run;
  assert.equal(input.dataset.loading, "0");
});
