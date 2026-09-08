// Every overlay in this panel enters ONCE per opening.
//
// Each has TWO animations — a fade on the backdrop and a pop-in on the card —
// and _render() rebuilds the whole subtree through feed(), so a newly created
// element runs both again. While an overlay was open, any unrelated re-render
// therefore played its whole entrance afresh: a second card popping in over the
// first, and another, and another. The tour's hand-off produced three in a row,
// because the panel's two load-phase renders land right after `add-task`.
//
// GATING THE BACKDROP ALONE FIXED NOTHING VISIBLE, which is how this was first
// shipped: the card is what the eye follows, and its pop-in was a separate
// rule. Both are gated now, and so are the detail panel and the board modal —
// the detail one re-renders on every keystroke in its own form.
//
// The elements cannot remember they have been painted, being new elements every
// time, so the panel remembers and stamps `data-entered`.
const test = require("node:test");
const assert = require("node:assert/strict");
const { render, find, findAll } = require("./helpers/render-skeleton.js");

// Everything else the skeleton may ask of the panel, answered emptily. The
// tests below are about ONE attribute; a getter missing from the harness must
// not read as a failure of it.
const REST = {
  isSubtask: () => false,
  getSubtasks: () => [],
  getSubtaskDraft: () => null,
  getTaskById: () => null,
  getEditingCommentId: () => null,
  getReplyingTo: () => null,
  getReactPickerFor: () => null,
  getCommentDraft: () => null,
  getReplyDraft: () => null,
  getRowUploads: () => [],
  isCommentRowBusy: () => false,
  getColMenuFor: () => null,
  getColRenameDraft: () => null,
  getPickerOpen: () => null,
  getDefaultStatus: () => "todo",
};

const open = (entered, over = {}) =>
  render({
    isCreating: () => true,
    hasPainted: () => entered,
    getCreateDraft: () => ({
      status: "todo", title: "", description: "", priority: "medium",
      due_date: "", start_date: "", duration_on: false,
      assignees: [], labels: [], pending_files: [],
    }),
    getState: () => ({ todo: [] }),
    getMembers: () => [], getMember: () => null, getLabels: () => [],
    getKnownAssignees: () => [], isColumnWatched: () => false,
    getTaskHistory: () => [], getComments: () => [],
    getSubtaskCount: () => ({ done: 0, total: 0 }),
    getAttachCount: () => 0, getCommentCount: () => 0,
    pickerService: () => "assignee-search", getPickerQuery: () => "",
    getAssigneeResults: () => [],
    getFileSearch: () => ({ query: "", results: [], scope: null, page: 1, hasMore: false }),
    // Every overlay in this panel needs the whole getter surface, not just the
    // one it is named after — the create modal grew subtask fields, and a
    // fixture that only fed the detail panel started failing on them.
    ...REST,
    ...over,
  });

test("the opening render is the one that animates", () => {
  const bd = find(open(false), "tasks-panel__create-backdrop");
  // The CSS selects on the ATTRIBUTE; a Skeletons node needs both, and
  // shipping only one is silent.
  assert.equal(bd.attrOpt["data-entered"], 0);
  assert.equal(bd.dataset.entered, 0);
});

test("every render after it is not", () => {
  const bd = find(open(true), "tasks-panel__create-backdrop");
  assert.equal(bd.attrOpt["data-entered"], 1);
  assert.equal(bd.dataset.entered, 1);
});

test("one modal, whichever render it is", () => {
  for (const entered of [false, true]) {
    assert.equal(findAll(open(entered), "tasks-panel__create-modal").length, 1);
    assert.equal(findAll(open(entered), "tasks-panel__create-backdrop").length, 1);
  }
});

// The create card was not the only one. The detail panel re-renders on every
// keystroke in its own form, and the board modal on every field — both flashed
// their whole entrance each time, for the same reason and with the same fix.
test("the detail panel is gated too", () => {
  const t = open(false, {
    isCreating: () => false,
    getDetailTask: () => ({ id: "t1", title: "Ship it", status: "todo" }),
    getDetailDraft: () => ({ title: "Ship it", description: "", status: "todo",
      priority: "medium", due_date: "", start_date: "", duration_on: false,
      assignees: [], labels: [] }),
    getDetailAttachments: () => [],
    getActivityTab: () => "comments",
    getActivityTab: () => "comments"
  });
  const bd = find(t, "tasks-panel__detail-backdrop");
  assert.ok(bd, "the detail overlay is drawn");
  assert.equal(bd.attrOpt["data-entered"], 0);
  assert.equal(bd.dataset.entered, 0);
});

test("and so is the board modal", () => {
  const t = open(true, {
    isCreating: () => false,
    getBoardModalState: () => ({ open: true, theme: "default", title: "", isDefault: true }),
  });
  const bd = find(t, "tasks-panel__board-backdrop");
  assert.ok(bd, "the board overlay is drawn");
  assert.equal(bd.attrOpt["data-entered"], 1);
});
