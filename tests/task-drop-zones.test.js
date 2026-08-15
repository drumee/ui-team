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
