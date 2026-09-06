// The create modal fades in ONCE per opening.
//
// Its backdrop carries `animation: tasks-panel-fade-in`, and _render() rebuilds
// the whole subtree through feed() — a newly created element runs its animation
// again. So while the modal was open, any unrelated re-render faded a second
// card in on top of the first, and the tour's hand-off produced three in a row:
// the panel's two load-phase renders land right after `add-task` opens it.
//
// The element cannot remember it has been painted — it is a new element every
// time — so the panel remembers, and stamps `data-entered`. These pin the two
// halves of that: the stamp reaches the markup, and there is still exactly one
// modal either way.
const test = require("node:test");
const assert = require("node:assert/strict");
const { render, find, findAll } = require("./helpers/render-skeleton.js");

const open = (entered) =>
  render({
    isCreating: () => true,
    isCreateEntered: () => entered,
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
