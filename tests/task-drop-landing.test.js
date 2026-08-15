// Task 6 — the landing matrix.
//
// Layer 2 of two. task-drop-zones.test.js answers "does the resolver decide
// correctly" against hand-built elements; this answers "where does a decision
// actually land, and does the markup it decided against exist". Three defects
// in this rework were invisible to hand-built fixtures, so every case here
// that depends on markup is driven from rendered skeleton output.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const {
  resolveZone,
} = require("../src/drumee/builtins/window/tasks/drop-zones");
const { render, find, findAll, DEFAULT_COMMENT } = require("./helpers/render-skeleton");

const P = "tasks-panel";
const PANEL = join(__dirname, "../src/drumee/builtins/window/tasks/index.js");
const panelSrc = readFileSync(PANEL, "utf8");

function extractClassMethod(source, name) {
  const m = new RegExp(`\\n  (async )?${name}\\(`).exec(source);
  assert.ok(m, `${name} not found in production source`);
  const start = m.index + 1;
  const end = source.indexOf("\n  }\n", start);
  assert.notEqual(end, -1, `${name} has no closing brace`);
  const body = source.slice(start, end + 4).trim().replace(/^async\s+/, "");
  return `${m[1] ? "async " : ""}function ${body}`;
}
const grabConst = (name, re) => {
  const m = re.exec(panelSrc);
  assert.ok(m, `${name} not found in production source`);
  return m[1];
};
const SCOPES = JSON.parse(
  grabConst("PICK_ATTACHMENT_SCOPES", /const PICK_ATTACHMENT_SCOPES = (\[[\s\S]*?\]);/)
    .replace(/,(\s*\])/, "$1"),
);
const ROW_SCOPE = eval(grabConst("ROW_SCOPE", /const ROW_SCOPE = (\/.+\/);/));

// ── The panel's real landing functions, lifted from source ────────────────
const landing = new Function(
  // Butler is deliberately NOT a parameter: the code tests `typeof Butler`
  // against the global, and shadowing it here would silently swallow every
  // refusal message the assertions look for.
  "SERVICE", "PICK_ATTACHMENT_SCOPES", "ROW_SCOPE", "LOCALE",
  `${extractClassMethod(panelSrc, "_onFilesDropped")}
   ${extractClassMethod(panelSrc, "_onAttachmentPicked")}
   ${extractClassMethod(panelSrc, "_pickAttachment")}
   ${extractClassMethod(panelSrc, "_draftForKey")}
   ${extractClassMethod(panelSrc, "_draftForScope")}
   ${extractClassMethod(panelSrc, "_scopeKey")}
   ${extractClassMethod(panelSrc, "_resolveAvailableName")}
   ${extractClassMethod(panelSrc, "_splitFilename")}
   ${extractClassMethod(panelSrc, "_stashPendingFiles")}
   ${extractClassMethod(panelSrc, "_isImageExt")}
   return { _onFilesDropped, _onAttachmentPicked, _pickAttachment, _draftForKey,
            _draftForScope, _scopeKey, _resolveAvailableName, _splitFilename,
            _stashPendingFiles, _isImageExt };`,
)(
  { task: { comment_link_file: "task.comment_link_file" } },
  SCOPES, ROW_SCOPE,
  new Proxy({}, { get: (_t, k) => String(k) }),
);

function panel(over = {}) {
  const said = [];
  const rowDrops = [];
  const refreshed = [];
  const p = {
    ...landing,
    said, rowDrops, refreshed,
    _hubId: "h1",
    _detailId: "t1",
    _createDefaults: null,
    _detailDraft: { pending_files: [] },
    _commentDraft: null,
    _replyDraft: null,
    _rowUploads: new Map(),
    _folderFilenames: new Set(),
    _attachments: {},
    _pendingUploadScope: null,
    _commentSaving: false,
    async _ensureFolderFilenames() { return this._folderFilenames; },
    async _dropOnCommentRow(id, files) { rowDrops.push([id, files.map((f) => f.name)]); },
    _refreshPendingList(k) { refreshed.push(k); },
    _refreshFileSearchDropdown() {},
    ensurePart: async () => ({ el: { querySelector: () => ({ click() {} }) } }),
    ...over,
  };
  // Butler is a global in production; capture what it says.
  global.Butler = { say: (m) => said.push(String(m)) };
  return p;
}

const fileEvent = (...names) => ({
  dataTransfer: { files: names.map((n) => ({ name: n })), types: ["Files"] },
});

// Build a hit element from RENDERED markup for a given zone.
const RENDER_OVER = {
  detail: {
    getDetailTask: () => ({ id: "t1", title: "T", status: "todo", created_by: "me" }),
    getDetailDraft: () => ({
      title: "T", description: "", status: "todo", priority: "medium",
      assignees: [], labels: [], pending_files: [],
    }),
    getComments: () => [DEFAULT_COMMENT],
  },
};
RENDER_OVER.create = {
  isCreating: () => true,
  getCreateDraft: () => ({
    status: "todo", title: "", description: "", priority: "medium",
    assignees: [], labels: [], pending_files: [],
  }),
};
RENDER_OVER.reply = {
  ...RENDER_OVER.detail,
  getReplyingTo: () => DEFAULT_COMMENT.id,
  getReplyDraft: () => ({ body: "", mention_uids: [] }),
};

// Turn a rendered descriptor into something with closest()/getAttribute().
function hitFor(tree, cls) {
  const chain = [];
  const seek = (n, path) => {
    if (!n || typeof n !== "object") return false;
    const next = path.concat(n);
    const has = typeof n.className === "string"
      && n.className.split(/\s+/).includes(cls);
    if (has) { chain.push(...next.reverse()); return true; }
    for (const k of [].concat(n.kids || [])) if (seek(k, next)) return true;
    return false;
  };
  assert.ok(seek(tree, []), `${cls} not present in rendered output`);
  const wrap = (i) => i >= chain.length ? null : {
    node: chain[i],
    get parent() { return wrap(i + 1); },
    closest(sel) {
      const m = /^\.([^[]+)(?:\[([^\]=]+)\])?$/.exec(sel);
      let n = this;
      while (n) {
        const cs = typeof n.node.className === "string"
          ? n.node.className.split(/\s+/) : [];
        const at = n.node.attrOpt || {};
        if (cs.includes(m[1]) && (!m[2] || at[m[2]] != null)) return n;
        n = n.parent;
      }
      return null;
    },
    getAttribute(k) {
      const v = (chain[i].attrOpt || {})[k];
      return v == null ? null : v;
    },
  };
  return wrap(0);
}

const ctxFor = (own = true) => ({ contains: () => true, isOwnComment: () => own });

// ── The 3 × 5 landing grid ───────────────────────────────────────────────
// Entry points A (native) and B (jQuery-UI) differ only in how the hit element
// is obtained — _dropPointEl normalises them before resolveZone — so both are
// exercised through the same resolved descriptor. C (positionless) is covered
// by the _lastDropScope case below.
const GRID = [
  { zone: "detail", cls: `${P}__attachment-rows`, over: "detail",
    landing: "detail", part: "detail", commit: "task update" },
  { zone: "create", cls: `${P}__file-picker`, over: "create",
    landing: "create", part: "create", commit: "task create" },
  { zone: "comment", cls: `${P}__comment-composer`, over: "detail",
    landing: "comment", part: "comment", commit: "comment send" },
  { zone: "comment-reply", cls: `${P}__comment-replybox`, over: "reply",
    landing: "comment-reply", part: "comment-reply", commit: "reply send" },
  { zone: "comment-row", cls: `${P}__comment-body`, over: "detail",
    landing: "row", part: null, commit: "immediate" },
];

for (const g of GRID) {
  test(`landing: a drop on ${g.zone} goes to ${g.landing} (${g.commit})`, async () => {
    const tree = render(RENDER_OVER[g.over]);
    const zone = resolveZone(P, hitFor(tree, g.cls), ctxFor());
    assert.ok(zone, `${g.zone} must resolve from rendered markup`);

    const p = panel({
      _createDefaults: g.zone === "create" ? { pending_files: [] } : null,
      _activeUploadScope: () => zone,
    });
    await p._onFilesDropped(fileEvent("spec.pdf"));

    if (g.landing === "row") {
      assert.deepEqual(p.rowDrops, [[DEFAULT_COMMENT.id, ["spec.pdf"]]]);
      assert.deepEqual(p.refreshed, [], "immediate path stages nothing");
    } else {
      const draft = p._draftForKey(g.part);
      assert.equal(draft.pending_files.length, 1, "file staged on its draft");
      assert.deepEqual(p.refreshed, [g.part], "its own pending part re-fed");
      assert.deepEqual(p.rowDrops, [], "no immediate write");
    }
  });
}

// ── Entry point C: positionless, via the remembered scope ────────────────
test("landing: a positionless drop uses the remembered comment scope", () => {
  const remember = new Function(
    `${extractClassMethod(panelSrc, "_rememberDropScope")}; return _rememberDropScope;`,
  )();
  const p = { _lastDropScope: null };
  remember.call(p, { scope: "comment-row", key: "comment-row:c1", commentId: "c1", el: {} });
  assert.deepEqual(p._lastDropScope, {
    scope: "comment-row", key: "comment-row:c1", commentId: "c1",
  });
  assert.equal(p._lastDropScope.el, undefined, "no detached element retained");

  // Task zones are recoverable from the pointer, so remembering one would let a
  // stale hover attach with no overlay ever shown.
  remember.call(p, { scope: "detail", key: "detail", el: {} });
  assert.equal(p._lastDropScope, null);
});

// ── Refusals ─────────────────────────────────────────────────────────────
const REFUSE = [
  ["the task title", `${P}__detail-title`, "detail"],
  ["panel chrome", `${P}__modal-side`, "detail"],
  ["the comment list gap", `${P}__comment-list`, "detail"],
];
for (const [label, cls, over] of REFUSE) {
  test(`refusal: ${label} resolves to no zone`, () => {
    const tree = render(RENDER_OVER[over]);
    assert.equal(resolveZone(P, hitFor(tree, cls), ctxFor()), null);
  });
}

test("refusal: a foreign-author row refuses rather than falling through", () => {
  const tree = render(RENDER_OVER.detail);
  assert.equal(resolveZone(P, hitFor(tree, `${P}__comment-body`), ctxFor(false)), null);
});

test("refusal: every refusal is audible", async () => {
  const p = panel({ _activeUploadScope: () => null });
  await p._onFilesDropped(fileEvent("spec.pdf"));
  assert.deepEqual(p.said, ["WRONG_DROP_AREA"], "a silent no-op is not a refusal");
  assert.deepEqual(p.rowDrops, []);
});

test("refusal: a viewer without task write rights gets no zone anywhere", () => {
  // _zoneFor's first line. Asserted on the source because the method closes
  // over `this`, and the guard must not be reorderable behind the resolve.
  const src = extractClassMethod(panelSrc, "_zoneFor");
  const body = src.slice(src.indexOf("{"));
  assert.match(
    body.split("\n").slice(1, 4).join("\n"),
    /if \(!this\._mayWriteTasks\(\)\) return null;/,
    "the write-rights gate must be the first thing _zoneFor does",
  );
});

// ── Cross-hub into the task zone ─────────────────────────────────────────
test("cross-hub: placeholder, then splice by identity with a second drop mid-download", async () => {
  const queue = new Function(
    `${extractClassMethod(panelSrc, "_queueCrossHubFiles")}; return _queueCrossHubFiles;`,
  )();
  const list = [];
  const draft = { pending_files: list };
  let resolveFetch;
  const p = {
    _hubId: "h1",
    _rowUploads: new Map(),
    _draftForScope: () => draft,
    _scopeKey: () => "detail",
    _setPendingStatus() {},
    _refreshPendingList() {},
    warn() {},
    async _stashPendingFiles(d, files) {
      d.pending_files.push({ localKey: `real:${files[0].name}`, file: files[0] });
    },
  };
  global.bootstrap = () => ({ endpoint: "", keysel: "" });
  global.fetch = () => new Promise((r) => { resolveFetch = r; });

  // Placeholder stands in immediately, before the bytes arrive.
  const ph = { localKey: "xhub:n9", crossHubNid: "n9", status: "downloading" };
  list.push(ph);
  const running = queue.call(p, [{ nid: "n9", hub_id: "other", filename: "far", ext: "pdf" }], draft);

  // A second drop lands WHILE the download is in flight, so the placeholder is
  // no longer at its original index — the splice must go by identity.
  list.push({ localKey: "local:second", file: { name: "second.pdf" } });
  assert.equal(list.indexOf(ph), 0);

  resolveFetch({ ok: true, blob: async () => ({ type: "application/pdf" }) });
  global.File = function (parts, name) { return { name }; };
  await running;

  assert.equal(list.includes(ph), false, "placeholder replaced");
  assert.ok(
    list.some((f) => f.localKey === "local:second"),
    "the file dropped mid-download survives",
  );
  delete global.fetch; delete global.File; delete global.bootstrap;
});

// ── Name collision ───────────────────────────────────────────────────────
test("collision: a.png collides against folder, pending and linked alike", async () => {
  const p = panel();
  p._folderFilenames = new Set(["a.png"]);
  assert.deepEqual(p._resolveAvailableName("a.png"), { filename: "a(1)", extension: "png" });

  // Now pending holds a(1).png too.
  p._detailDraft.pending_files = [{ filename: "a(1)", extension: "png" }];
  assert.deepEqual(p._resolveAvailableName("a.png"), { filename: "a(2)", extension: "png" });

  // And a linked attachment holds a(2).png.
  p._attachments.t1 = [{ filename: "a(2)", extension: "png" }];
  assert.deepEqual(p._resolveAvailableName("a.png"), { filename: "a(3)", extension: "png" });
});

// ── In-flight guard ──────────────────────────────────────────────────────
test("a drop is still accepted while a comment save is in flight", async () => {
  // _commentSaving blocks Save and Cancel, not staging — aborting an upload
  // mid-flight is what it exists to prevent, and a new drop starts nothing.
  const tree = render(RENDER_OVER.detail);
  const zone = resolveZone(P, hitFor(tree, `${P}__comment-composer`), ctxFor());
  const p = panel({ _activeUploadScope: () => zone, _commentSaving: true });
  await p._onFilesDropped(fileEvent("late.pdf"));
  assert.equal(p._commentDraft.pending_files.length, 1);
});

// ── Picker / drop agreement ──────────────────────────────────────────────
test("agreement: picker and drop land in the same place for every zone", async () => {
  const cases = [
    ["detail", "detail", `${P}__attachment-rows`, "detail"],
    ["create", "create", `${P}__file-picker`, "create"],
    ["comment", "comment", `${P}__comment-composer`, "detail"],
    ["comment-reply", "comment-reply", `${P}__comment-replybox`, "reply"],
  ];
  for (const [picker, key, cls, over] of cases) {
    const tree = render(RENDER_OVER[over]);
    const zone = resolveZone(P, hitFor(tree, cls), ctxFor());
    assert.equal(zone.key, key, `${picker}: drop resolves to ${key}`);

    const viaPick = panel({ _createDefaults: { pending_files: [] } });
    await viaPick._pickAttachment({ mget: (k) => (k === "searchScope" ? picker : null) });
    await viaPick._onAttachmentPicked({ target: { files: [{ name: "x.pdf" }], value: "" } });

    const viaDrop = panel({ _createDefaults: { pending_files: [] }, _activeUploadScope: () => zone });
    await viaDrop._onFilesDropped(fileEvent("x.pdf"));

    assert.deepEqual(viaPick.refreshed, viaDrop.refreshed, `${picker}: same pending part`);
    assert.deepEqual(viaPick.rowDrops, viaDrop.rowDrops, `${picker}: same commit path`);
  }
});

test("agreement: the row paperclip takes the IMMEDIATE path, not a staged draft", async () => {
  // The trap this guards: _draftForKey("comment-row:<id>") has no branch, so a
  // staged route would return undefined and drop the file on the floor.
  const viaPick = panel();
  await viaPick._pickAttachment({
    mget: (k) => (k === "searchScope" ? `comment-row:${DEFAULT_COMMENT.id}` : null),
  });
  await viaPick._onAttachmentPicked({ target: { files: [{ name: "x.pdf" }], value: "" } });

  const tree = render(RENDER_OVER.detail);
  const zone = resolveZone(P, hitFor(tree, `${P}__comment-body`), ctxFor());
  const viaDrop = panel({ _activeUploadScope: () => zone });
  await viaDrop._onFilesDropped(fileEvent("x.pdf"));

  assert.deepEqual(viaPick.rowDrops, [[DEFAULT_COMMENT.id, ["x.pdf"]]]);
  assert.deepEqual(viaPick.rowDrops, viaDrop.rowDrops, "same function, same args");
  assert.deepEqual(viaPick.refreshed, [], "nothing staged under a key no submit commits");
});
