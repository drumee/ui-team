// Drop-zone resolution for the task panel. The panel used to treat the whole
// detail panel as one task drop zone and only accepted a comment while it was
// being edited; this table makes every region explicit, and refusal the default.
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveZone,
  ZONES,
} = require("../src/drumee/builtins/window/tasks/drop-zones");

// Minimal element stand-in: closest() walks a parent chain of class sets.
// chain[0] is the hit element, each later entry its parent.
function el(chain) {
  const node = (i) =>
    i >= chain.length
      ? null
      : {
          classes: chain[i].cls || [],
          attrs: chain[i].attrs || {},
          get parent() {
            return node(i + 1);
          },
          closest(sel) {
            const m = /^\.([^[]+)(?:\[([^\]=]+)(?:="?([^"\]]*)"?)?\])?$/.exec(sel);
            let n = this;
            while (n) {
              if (n.classes.includes(m[1]) && (!m[2] || n.attrs[m[2]] != null)) {
                return n;
              }
              n = n.parent;
            }
            return null;
          },
          getAttribute(k) {
            return this.attrs[k] == null ? null : this.attrs[k];
          },
        };
  return node(0);
}

const ctx = { contains: () => true, isOwnComment: () => true };

test("a drop over the attachments block resolves to the task", () => {
  const node = el([
    { cls: ["tasks-panel__attachment-rows"] },
    { cls: ["tasks-panel__attachments"] },
  ]);
  const z = resolveZone("tasks-panel", node, ctx);
  assert.equal(z.scope, "detail");
  assert.equal(z.key, "detail");
  assert.ok(z.el, "descriptor carries the matched zone element");
});

test("the create modal's file field resolves to the create scope", () => {
  const node = el([
    { cls: ["tasks-panel__file-search-input"] },
    { cls: ["tasks-panel__file-picker"] },
    { cls: ["tasks-panel__create-files"] },
  ]);
  assert.equal(resolveZone("tasks-panel", node, ctx).scope, "create");
});

test("the comment composer resolves to the comment scope", () => {
  const node = el([
    { cls: ["tasks-panel__comment-input"] },
    { cls: ["tasks-panel__comment-field"] },
    { cls: ["tasks-panel__comment-composer"] },
    { cls: ["tasks-panel__comments"] },
  ]);
  assert.equal(resolveZone("tasks-panel", node, ctx).scope, "comment");
});

test("the reply composer resolves to the reply scope", () => {
  const inReplybox = el([
    { cls: ["tasks-panel__comment-reply-field"] },
    { cls: ["tasks-panel__comment-replybox"] },
    { cls: ["tasks-panel__comments"] },
  ]);
  assert.equal(resolveZone("tasks-panel", inReplybox, ctx).scope, "comment-reply");
});

test("an inner zone wins over an outer one when they DO nest", () => {
  // The shipped zones never nest — __comment-replybox and __comment-row are
  // thread siblings, __attachments and __comments are siblings in __modal-main
  // — so this proves the ordering rule itself rather than any real pairing.
  // If a future zone is added inside another, this is what holds it correct.
  const nested = el([
    { cls: ["tasks-panel__comment-reply-field"] },
    { cls: ["tasks-panel__comment-replybox"] },
    { cls: ["tasks-panel__comment-row"], attrs: { "data-comment-id": "c1" } },
  ]);
  assert.equal(resolveZone("tasks-panel", nested, ctx).scope, "comment-reply");
});

test("an own comment row resolves per-row and carries its id", () => {
  // Real DOM: rows live under __comments, a SIBLING of __attachments.
  const row = el([
    { cls: ["tasks-panel__comment-body"] },
    { cls: ["tasks-panel__comment-row"], attrs: { "data-comment-id": "c9" } },
    { cls: ["tasks-panel__comment-list"] },
    { cls: ["tasks-panel__comments"] },
  ]);
  const z = resolveZone("tasks-panel", row, ctx);
  assert.equal(z.scope, "comment-row");
  assert.equal(z.commentId, "c9");
  assert.equal(z.key, "comment-row:c9");
});

test("a foreign-author comment row refuses instead of falling through", () => {
  const row = el([
    { cls: ["tasks-panel__comment-body"] },
    { cls: ["tasks-panel__comment-row"], attrs: { "data-comment-id": "c9" } },
    { cls: ["tasks-panel__comments"] },
  ]);
  const foreign = { contains: () => true, isOwnComment: () => false };
  assert.equal(resolveZone("tasks-panel", row, foreign), null);
});

test("the gap between two comment rows refuses", () => {
  // __comment-list carries a 12px gap; it is not a zone and neither are its
  // ancestors, so a pointer in the gap matches nothing.
  const gap = el([
    { cls: ["tasks-panel__comment-list"] },
    { cls: ["tasks-panel__activity-section"] },
    { cls: ["tasks-panel__comments"] },
  ]);
  assert.equal(resolveZone("tasks-panel", gap, ctx), null);
});

test("panel chrome outside every zone refuses", () => {
  const chrome = el([
    { cls: ["tasks-panel__detail-title"] },
    { cls: ["tasks-panel__detail-panel"] },
  ]);
  assert.equal(resolveZone("tasks-panel", chrome, ctx), null);
});

test("a node outside the panel refuses even when it matches a zone", () => {
  const outside = el([{ cls: ["tasks-panel__attachments"] }]);
  assert.equal(
    resolveZone("tasks-panel", outside, { ...ctx, contains: () => false }),
    null,
  );
});

test("a comment row without an id is not a zone", () => {
  // The selector requires [data-comment-id]; a row missing it must not resolve
  // to a row scope with an undefined target.
  const row = el([
    { cls: ["tasks-panel__comment-row"] },
    { cls: ["tasks-panel__comments"] },
  ]);
  assert.equal(resolveZone("tasks-panel", row, ctx), null);
});

test("a null or non-element hit refuses", () => {
  assert.equal(resolveZone("tasks-panel", null, ctx), null);
  assert.equal(resolveZone("tasks-panel", {}, ctx), null);
});

test("every ZONES entry is reachable and uniquely scoped", () => {
  const scopes = ZONES.map((z) => z.scope);
  assert.equal(new Set(scopes).size, scopes.length, "scopes are unique");
  assert.deepEqual(scopes, [
    "comment-reply",
    "comment-row",
    "comment",
    "detail",
    "create",
  ]);
});

// ── Per-row immediate uploads ────────────────────────────────────────────
// A comment row has no submit, so the drop IS the commit. These exercise the
// real _linkSucceeded / _dropOnCommentRow / _stageRowItems lifted from source.
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
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

const linkSucceeded = new Function(
  `${extractClassMethod(panelSrc, "_linkSucceeded")}; return _linkSucceeded;`,
)();

test("_linkSucceeded separates success from BOTH failure shapes", () => {
  // Verified against the SP: a fresh link and a duplicate INSERT IGNORE both
  // return the comment's full attachment list, non-empty in each case.
  assert.equal(linkSucceeded([{ comment_id: "cA", file_nid: "fA" }]), true);
  // postService resolves — it never rejects — so these are what failure looks like.
  assert.equal(linkSucceeded(undefined), false, "transport failure / non-200");
  assert.equal(
    linkSucceeded({ error: "COMMENT_NOT_FOUND", reason: "not the author" }),
    false,
    "server refusal resolves with an error payload, not a throw",
  );
  assert.equal(linkSucceeded([]), false, "empty list is not a successful link");
});

// A panel stand-in carrying the real row-upload methods.
function rowPanel(linkResults) {
  const calls = [];
  const methods = new Function(
    "SERVICE",
    `
    ${extractClassMethod(panelSrc, "_linkSucceeded")}
    ${extractClassMethod(panelSrc, "_dropOnCommentRow")}
    ${extractClassMethod(panelSrc, "_dropRowUpload")}
    return { _linkSucceeded, _dropOnCommentRow, _dropRowUpload };
    `,
  )({ task: { comment_link_file: "task.comment_link_file" } });
  return {
    ...methods,
    calls,
    _detailId: "t1",
    _hubId: "h1",
    _rowUploads: new Map(),
    _staged: [],
    async _stageRowItems(id, items) {
      const list = this._rowUploads.get(id) || [];
      this._rowUploads.set(id, list);
      const added = items.map((f, i) => ({
        localKey: `row:${id}:${i}:${f.name}`,
        file: f,
        filename: f.name,
        status: "queued",
      }));
      list.push(...added);
      return added;
    },
    async _uploadPendingFile(pf) {
      return { nid: `nid-${pf.filename}` };
    },
    async postService(args) {
      calls.push(args.file_nid);
      const r = linkResults.shift();
      return r;
    },
    _setPendingStatus(key, entry, status) {
      entry.status = status;
    },
    _refreshCommentList() {},
    async _loadComments() {},
    _pendingKey: (f) => String(f.localKey || f.nid || ""),
  };
}

test("a successful row drop links every file and empties the in-flight list", async () => {
  const OK = [{ file_nid: "x" }];
  const p = rowPanel([OK, OK]);
  await p._dropOnCommentRow("cA", [{ name: "a.pdf" }, { name: "b.pdf" }]);
  assert.deepEqual(p.calls, ["nid-a.pdf", "nid-b.pdf"]);
  assert.equal(p._rowUploads.has("cA"), false, "list cleared once all landed");
});

test("a server refusal is marked error, not silently swallowed", async () => {
  // The whole point of reading the resolved value: this used to look like success.
  const p = rowPanel([{ error: "COMMENT_NOT_FOUND" }]);
  await p._dropOnCommentRow("cA", [{ name: "a.pdf" }]);
  const left = p._rowUploads.get("cA");
  assert.equal(left.length, 1, "entry retained for retry");
  assert.equal(left[0].status, "error");
  assert.equal(left[0].nid, "nid-a.pdf", "upload kept; only the link needs retry");
});

test("two consecutive failures abort the rest of the queue", async () => {
  const p = rowPanel([undefined, undefined, [{ file_nid: "x" }]]);
  await p._dropOnCommentRow("cA", [
    { name: "a.pdf" }, { name: "b.pdf" }, { name: "c.pdf" },
  ]);
  assert.deepEqual(p.calls, ["nid-a.pdf", "nid-b.pdf"], "third never attempted");
  assert.equal(p._rowUploads.get("cA").length, 3, "all three still held");
});

test("an isolated failure between successes does NOT abort", async () => {
  const OK = [{ file_nid: "x" }];
  const p = rowPanel([OK, undefined, OK]);
  await p._dropOnCommentRow("cA", [
    { name: "a.pdf" }, { name: "b.pdf" }, { name: "c.pdf" },
  ]);
  assert.equal(p.calls.length, 3, "counter resets on success");
  const left = p._rowUploads.get("cA");
  assert.equal(left.length, 1);
  assert.equal(left[0].filename, "b.pdf");
});

// ── The selector's real-DOM dependency ───────────────────────────────────
// ZONES matches __comment-row[data-comment-id]. Every unit fixture above builds
// that attribute by hand, so none of them can tell whether the SKELETON emits
// it. It did not: only the edit-mode row carried it, which made the attribute
// itself the edit-mode gate and left per-row drop dead for every other row.
test("every rendered comment row carries data-comment-id", () => {
  const SKEL = join(
    __dirname,
    "../src/drumee/builtins/window/tasks/skeleton/index.js",
  );
  const src = readFileSync(SKEL, "utf8");

  // Each place the skeleton opens a __comment-row descriptor.
  const opens = [...src.matchAll(/className: `\$\{pfx\}__comment-row`/g)];
  assert.ok(opens.length >= 2, "expected the edit-mode and normal row renders");

  for (const m of opens) {
    // attrOpt follows the className within the same descriptor literal; look
    // ahead only as far as the next `kids:` so we cannot borrow a child's.
    const after = src.slice(m.index, src.indexOf("kids:", m.index));
    assert.match(
      after,
      /"data-comment-id": c\.id/,
      `a __comment-row render at offset ${m.index} omits data-comment-id — ` +
        "the zone resolver cannot see that row",
    );
  }
});
