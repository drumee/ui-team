// Every drop zone must exist in the markup the skeleton ACTUALLY renders, and
// must carry its overlay as a DIRECT child — the skin rules use `>`.
//
// The unit fixtures in task-drop-zones.test.js build these by hand, so they
// cannot see markup divergence. Twice they didn't: data-comment-id was emitted
// only on the edit-mode row, and the normal row had no overlay at all. Both
// left a zone that resolved in theory and did nothing on screen.
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  render,
  find,
  findAll,
  childrenWithClass,
  DEFAULT_COMMENT,
} = require("./helpers/render-skeleton");

const P = "tasks-panel";
const detailOpen = {
  getDetailTask: () => ({ id: "t1", title: "T", status: "todo", created_by: "me" }),
  getDetailDraft: () => ({
    title: "T", description: "", status: "todo", priority: "medium",
    assignees: [], labels: [], pending_files: [],
  }),
  getComments: () => [DEFAULT_COMMENT],
};

test("the task zone renders with its overlay as a direct child", () => {
  const tree = render(detailOpen);
  const zone = find(tree, `${P}__attachments`);
  assert.ok(zone, "__attachments is rendered when a task detail is open");
  assert.equal(
    childrenWithClass(zone, `${P}__drop-overlay`).length,
    1,
    "__attachments must own its overlay directly",
  );
});

test("the create zone renders with its overlay as a direct child", () => {
  // Never appeared in the Task 2 probe table — verify rather than assume.
  const tree = render({
    isCreating: () => true,
    getCreateDraft: () => ({
      status: "todo", title: "", description: "", priority: "medium",
      assignees: [], labels: [], pending_files: [],
    }),
  });
  const zone = find(tree, `${P}__create-files`);
  assert.ok(zone, "__create-files is rendered when the create modal is open");
  assert.equal(
    childrenWithClass(zone, `${P}__drop-overlay`).length,
    1,
    "__create-files must own its overlay directly",
  );
});

test("the composer zone renders with its overlay as a direct child", () => {
  const tree = render(detailOpen);
  const zone = find(tree, `${P}__comment-composer`);
  assert.ok(zone, "__comment-composer is rendered with a task detail open");
  assert.equal(
    childrenWithClass(zone, `${P}__comment-drop-overlay`).length,
    1,
    "__comment-composer must own its overlay directly",
  );
});

test("the reply zone renders with its overlay as a direct child", () => {
  const tree = render({
    ...detailOpen,
    getReplyingTo: () => DEFAULT_COMMENT.id,
    getReplyDraft: () => ({ body: "", mention_uids: [] }),
  });
  const zone = find(tree, `${P}__comment-replybox`);
  assert.ok(zone, "__comment-replybox is rendered while replying");
  assert.equal(
    childrenWithClass(zone, `${P}__comment-drop-overlay`).length,
    1,
    "__comment-replybox must own its overlay directly",
  );
});

test("EVERY comment row is a usable zone, not just the edited one", () => {
  // The defect this file exists for: the row resolved only while being edited
  // (data-comment-id), and even then the normal row had no overlay to reveal.
  for (const [label, over] of [
    ["not editing", detailOpen],
    ["editing this row", { ...detailOpen, getEditingCommentId: () => DEFAULT_COMMENT.id }],
  ]) {
    const tree = render(over);
    const rows = findAll(tree, `${P}__comment-row`);
    assert.ok(rows.length >= 1, `${label}: a comment row is rendered`);
    for (const row of rows) {
      const attrs = row.attrOpt || {};
      assert.equal(
        attrs["data-comment-id"],
        DEFAULT_COMMENT.id,
        `${label}: the row must carry the id the resolver matches on`,
      );
      assert.equal(
        childrenWithClass(row, `${P}__comment-drop-overlay`).length,
        1,
        `${label}: the row must own its overlay directly`,
      );
    }
  }
});

test("no orphaned overlay survives outside a zone", () => {
  // Task 2 moved the affordance from two root flags to per-zone elements, so a
  // __drop-overlay anywhere that is not a zone can never light again.
  const ZONES = [`${P}__attachments`, `${P}__create-files`];
  const tree = render({
    ...detailOpen,
    isCreating: () => true,
    getCreateDraft: () => ({
      status: "todo", title: "", description: "", priority: "medium",
      assignees: [], labels: [], pending_files: [],
    }),
  });
  const owners = [];
  const visit = (n, parent) => {
    if (!n || typeof n !== "object") return;
    const cls = typeof n.className === "string" ? n.className.split(/\s+/) : [];
    if (cls.includes(`${P}__drop-overlay`)) owners.push(parent);
    for (const k of [].concat(n.kids || [])) visit(k, n);
  };
  visit(tree, null);
  assert.ok(owners.length > 0, "overlays are rendered at all");
  for (const owner of owners) {
    const cls = (owner && owner.className) || "";
    assert.ok(
      ZONES.some((z) => cls.split(/\s+/).includes(z)),
      `a __drop-overlay hangs off "${cls}", which is not a drop zone — dead markup`,
    );
  }
});
