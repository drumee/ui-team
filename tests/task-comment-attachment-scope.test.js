// The paperclip in a comment composer (tasks-panel__composer-ico) must queue
// its file on the COMMENT being edited/answered, so it ends up in that row's
// tasks-panel__comment-attachments — not on the task's own pending strip
// (tasks-panel__file-pending-list), which is where every scope used to land.
//
// Root cause guarded here: composerTools() built the paperclip without a
// `searchScope`, so _pickAttachment always fell through to "detail".
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const PANEL = join(__dirname, "../src/drumee/builtins/window/tasks/index.js");
const SKELETON = join(
  __dirname,
  "../src/drumee/builtins/window/tasks/skeleton/index.js",
);

const panelSrc = readFileSync(PANEL, "utf8");
const skeletonSrc = readFileSync(SKELETON, "utf8");

// Lift a class method out of the production source as a standalone function,
// so the routing can be exercised without the whole LetcBox runtime.
function extractClassMethod(source, name) {
  const m = new RegExp(`\\n  (async )?${name}\\(`).exec(source);
  assert.ok(m, `${name} not found in production source`);
  const start = m.index + 1;
  const end = source.indexOf("\n  }\n", start);
  assert.notEqual(end, -1, `${name} has no closing brace`);
  const body = source.slice(start, end + 4).trim().replace(/^async\s+/, "");
  return `${m[1] ? "async " : ""}function ${body}`;
}

function extractFunction(source, name) {
  const start = source.indexOf(`\nfunction ${name}(`);
  assert.notEqual(start, -1, `${name} not found in production source`);
  const end = source.indexOf("\n}\n", start);
  assert.notEqual(end, -1, `${name} has no closing brace`);
  return source.slice(start, end + 2);
}

const SCOPES = (() => {
  const m = /const PICK_ATTACHMENT_SCOPES = (\[[\s\S]*?\]);/.exec(panelSrc);
  assert.ok(m, "PICK_ATTACHMENT_SCOPES not found in production source");
  return JSON.parse(m[1].replace(/,(\s*\])/, "$1"));
})();

const ROW_SCOPE = (() => {
  const m = /const ROW_SCOPE = (\/.+\/);/.exec(panelSrc);
  assert.ok(m, "ROW_SCOPE not found in production source");
  return eval(m[1]);
})();

const panelMethods = new Function(
  "PICK_ATTACHMENT_SCOPES",
  "ROW_SCOPE",
  `
  ${extractClassMethod(panelSrc, "_pickAttachment")}
  ${extractClassMethod(panelSrc, "_onAttachmentPicked")}
  ${extractClassMethod(panelSrc, "_draftForKey")}
  return { _pickAttachment, _onAttachmentPicked, _draftForKey };
`,
)(SCOPES, ROW_SCOPE);

// Minimal stand-in for the panel: real routing methods, stubbed I/O.
function makePanel() {
  const refreshed = [];
  const stashed = [];
  return {
    ...panelMethods,
    refreshed,
    stashed,
    _createDefaults: null,
    _detailDraft: { title: "t", pending_files: [] },
    _commentDraft: null,
    _commentEditDraft: null,
    _replyDraft: null,
    _pendingUploadScope: null,
    ensurePart: async () => ({
      el: { querySelector: () => ({ click() {} }) },
    }),
    async _stashPendingFiles(draft, files) {
      stashed.push({ draft, files });
      draft.pending_files = (draft.pending_files || []).concat(files);
    },
    _refreshPendingList(scope) {
      refreshed.push(scope);
    },
  };
}

// One full picker round-trip: click the paperclip, then the native picker fires
// change with the chosen file.
async function pick(panel, scope, file = { name: "spec.pdf" }) {
  await panel._pickAttachment({ mget: (k) => (k === "searchScope" ? scope : null) });
  await panel._onAttachmentPicked({ target: { files: [file], value: "x" } });
}

test("composerTools tags every paperclip with its own scope", () => {
  const Svg = [];
  global.Skeletons = {
    Button: { Svg: (p) => (Svg.push(p), { ...p }) },
    Note: (p) => ({ ...p }),
  };
  const composerTools = new Function(
    `${extractFunction(skeletonSrc, "composerTools")}; return composerTools;`,
  )();
  const ui = { fig: { family: "tasks-panel" } };

  for (const scope of ["comment", "comment-row:c9", "comment-reply"]) {
    const [clip] = composerTools(ui, scope);
    assert.equal(clip.className, "tasks-panel__composer-ico");
    assert.equal(clip.service, "pick-attachment");
    // The regression: this was absent, so _pickAttachment saw undefined.
    assert.equal(clip.searchScope, scope, `paperclip scope for ${scope}`);
  }
  delete global.Skeletons;
});

test("a file picked while editing a comment attaches to THAT comment", async () => {
  // The edit composer sits inside a row, and a row has no submit — so its
  // paperclip commits immediately to that comment, exactly as a drop there
  // does. Routing it to the plain "comment" scope would have attached the file
  // to a NEW comment instead of the one being edited.
  const panel = makePanel();
  const dropped = [];
  panel._dropOnCommentRow = async (id, files) => dropped.push([id, files.length]);

  await pick(panel, "comment-row:c9");

  assert.deepEqual(dropped, [["c9", 1]], "went straight to that row");
  assert.deepEqual(panel._detailDraft.pending_files, [], "not the task");
  assert.equal(panel._commentDraft, null, "not a new comment");
});

test("a file picked while replying lands on the reply", async () => {
  const panel = makePanel();
  panel._replyDraft = { body: "re", mention_uids: [] };

  await pick(panel, "comment-reply");

  assert.equal(panel._replyDraft.pending_files.length, 1);
  assert.deepEqual(panel._detailDraft.pending_files, []);
  assert.deepEqual(panel.refreshed, ["comment-reply"]);
});

test("the reply paperclip works before a single character is typed", async () => {
  const panel = makePanel();
  assert.equal(panel._replyDraft, null);

  await pick(panel, "comment-reply");

  // _draftForKey({create:true}) allocates it, as the drop path relies on.
  assert.ok(panel._replyDraft, "reply draft allocated on demand");
  assert.equal(panel._replyDraft.pending_files.length, 1);
  assert.deepEqual(panel._detailDraft.pending_files, []);
});

test("task-level scopes are unchanged", async () => {
  const detail = makePanel();
  await pick(detail, "detail");
  assert.equal(detail._detailDraft.pending_files.length, 1);
  assert.deepEqual(detail.refreshed, ["detail"]);

  const create = makePanel();
  create._createDefaults = { title: "", pending_files: [] };
  await pick(create, "create");
  assert.equal(create._createDefaults.pending_files.length, 1);
  assert.deepEqual(create._detailDraft.pending_files, []);
  assert.deepEqual(create.refreshed, ["create"]);
});

test("a file picked in the main composer lands on the comment being written", async () => {
  const panel = makePanel();
  panel._commentDraft = { body: "look", mention_uids: [] };

  await pick(panel, "comment");

  assert.equal(panel._commentDraft.pending_files.length, 1);
  assert.equal(panel._commentDraft.pending_files[0].name, "spec.pdf");
  // The bug: this used to be where the file went.
  assert.deepEqual(panel._detailDraft.pending_files, []);
  assert.deepEqual(panel.refreshed, ["comment"]);
});

test("the main composer's paperclip works before a character is typed", async () => {
  const panel = makePanel();
  assert.equal(panel._commentDraft, null);

  await pick(panel, "comment");

  assert.ok(panel._commentDraft, "composer draft allocated on demand");
  assert.equal(panel._commentDraft.pending_files.length, 1);
  assert.deepEqual(panel._detailDraft.pending_files, []);
});

test("typing after queueing a file keeps the file", () => {
  // The composer's mention-target setter used to REPLACE _commentDraft, which
  // silently dropped queued files on the next keystroke.
  global.LOCALE = new Proxy({}, { get: () => "placeholder" });
  const mentionTarget = new Function(
    `${extractClassMethod(panelSrc, "_mentionTarget")}; return _mentionTarget;`,
  )();
  const panel = {
    fig: { family: "tasks-panel" },
    _commentDraft: {
      body: "",
      mention_uids: [],
      pending_files: [{ name: "a.png" }],
    },
  };

  mentionTarget.call(panel, "comment").set("hello", ["u1"]);

  assert.equal(panel._commentDraft.body, "hello");
  assert.deepEqual(panel._commentDraft.mention_uids, ["u1"]);
  assert.equal(
    panel._commentDraft.pending_files.length,
    1,
    "queued file survives a keystroke",
  );
  delete global.LOCALE;
});

// Closing the picker/drop disagreement was one of the original motivations, and
// the two were fixed in separate changes — the paperclip predates the zone
// table. Assert they converge rather than assuming it.
test("the composer's paperclip and a composer drop land in the same place", async () => {
  const { resolveZone } = require("../src/drumee/builtins/window/tasks/drop-zones");
  const scopeKey = new Function(
    `${extractClassMethod(panelSrc, "_scopeKey")}; return _scopeKey;`,
  )();

  // Drop path: a hit inside the composer, resolved by the shipped zone table.
  const closest = (sel, chain) =>
    chain.find((c) => c.cls.includes(sel.replace(/^\./, "").replace(/\[.*$/, "")));
  const chain = [
    { cls: ["tasks-panel__comment-input"] },
    { cls: ["tasks-panel__comment-field"] },
    { cls: ["tasks-panel__comment-composer"] },
  ];
  const hit = {
    closest(sel) {
      const n = closest(sel, chain);
      return n ? { ...n, getAttribute: () => null } : null;
    },
  };
  const zone = resolveZone("tasks-panel", hit, {
    contains: () => true,
    isOwnComment: () => true,
  });

  // Picker path: the scope composerTools stamps on the paperclip.
  const Svg = [];
  global.Skeletons = {
    Button: { Svg: (p) => (Svg.push(p), { ...p }) },
    Note: (p) => ({ ...p }),
  };
  const composerTools = new Function(
    `${extractFunction(skeletonSrc, "composerTools")}; return composerTools;`,
  )();
  const [clip] = composerTools({ fig: { family: "tasks-panel" } }, "comment");
  delete global.Skeletons;

  // They must name the SAME pending-list part…
  assert.equal(zone.scope, "comment");
  assert.equal(scopeKey(zone), "comment");
  assert.equal(clip.searchScope, "comment");
  assert.equal(scopeKey(zone), clip.searchScope, "picker and drop agree");

  // …and resolve to the SAME draft object, which is what makes both commit on
  // Send via _submitComment rather than on the task's Update.
  const dropPanel = makePanel();
  await pick(dropPanel, clip.searchScope, { name: "from-picker.pdf" });
  const viaPicker = dropPanel._commentDraft;
  const viaDrop = dropPanel._draftForKey(scopeKey(zone), { create: true });
  assert.equal(viaDrop, viaPicker, "same draft object, not merely same shape");
  assert.deepEqual(dropPanel.refreshed, ["comment"]);
  assert.deepEqual(dropPanel._detailDraft.pending_files, []);
});

test("unknown scopes still attach to the task", async () => {
  for (const scope of [undefined, "nonsense"]) {
    const panel = makePanel();
    await pick(panel, scope);
    assert.equal(
      panel._detailDraft.pending_files.length,
      1,
      `scope ${scope} should fall back to the task`,
    );
    assert.deepEqual(panel.refreshed, ["detail"]);
    assert.equal(panel._commentDraft, null);
  }
});

// ── _linkCommentFiles: a server refusal must not read as success ─────────
// postService NEVER rejects — a refusal resolves with {error, reason}. The link
// leg used to sit in a bare try/catch, so every refusal returned ok:true: the
// entry was dropped from the strip, its blob revoked, and failed:0 reported,
// while the file sat in the folder unattached. Silent data loss.
function linkPanel(results) {
  const posted = [];
  const methods = new Function(
    "SERVICE",
    `${extractClassMethod(panelSrc, "_linkCommentFiles")}
     ${extractClassMethod(panelSrc, "_linkSucceeded")}
     return { _linkCommentFiles, _linkSucceeded };`,
  )({ task: { comment_link_file: "task.comment_link_file" } });
  return {
    ...methods,
    posted,
    _hubId: "h1",
    _detailId: "t1",
    _commentSaving: false,
    async _uploadPendingFile(pf) {
      return { nid: `nid-${pf.filename}` };
    },
    async postService(a) {
      posted.push(a.file_nid);
      return results.shift();
    },
    _setPendingStatus(_k, entry, status) {
      entry.status = status;
    },
  };
}

test("a refused comment link keeps the file, marks it error, and reports failed", async () => {
  const revoked = [];
  const realURL = global.URL;
  global.URL = { revokeObjectURL: (u) => revoked.push(u) };

  const entry = {
    localKey: "k1",
    filename: "spec",
    file: { name: "spec.pdf" },
    previewUrl: "blob:keep-me",
    status: "queued",
  };
  const draft = { pending_files: [entry] };
  const p = linkPanel([{ error: "COMMENT_NOT_FOUND", reason: "not the author" }]);

  const res = await p._linkCommentFiles("cA", draft, "t1", "comment-edit");

  assert.deepEqual(res, { failed: 1, linked: 0 }, "reported as a failure");
  assert.deepEqual(draft.pending_files, [entry], "entry survives for retry");
  assert.equal(entry.status, "error", "routed into the error surface");
  assert.equal(entry.previewUrl, "blob:keep-me");
  assert.deepEqual(revoked, [], "blob URL NOT revoked on failure");
  assert.equal(p._commentSaving, false, "save guard released");

  global.URL = realURL;
});

test("a successful comment link still clears the entry and revokes its blob", async () => {
  const revoked = [];
  const realURL = global.URL;
  global.URL = { revokeObjectURL: (u) => revoked.push(u) };

  const entry = { localKey: "k1", filename: "spec", file: { name: "spec.pdf" }, previewUrl: "blob:gone" };
  const draft = { pending_files: [entry] };
  const p = linkPanel([[{ comment_id: "cA", file_nid: "nid-spec" }]]);

  const res = await p._linkCommentFiles("cA", draft, "t1", "comment-edit");

  assert.deepEqual(res, { failed: 0, linked: 1 });
  assert.deepEqual(draft.pending_files, [], "entry cleared once attached");
  assert.deepEqual(revoked, ["blob:gone"]);

  global.URL = realURL;
});
