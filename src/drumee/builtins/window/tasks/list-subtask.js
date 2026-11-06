// List view inline subtask creator (Figma "subtask - list", 873:238375): the
// row ＋ opens an "Enter subtask name..." row under the parent, expanded, and
// Enter creates the child there — no detail panel. Mixed into __tasks_panel's
// prototype at the bottom of index.js, so `this` is the panel.
//
// State: `_inlineSubtask` — `{ parentId, busy }` or null. One creator at a
// time across the table; opening another parent's replaces it.
//
// The Gantt ＋ keeps "add-child-task" (detail panel with the creator open):
// its Figma flow ends on that screen (873:233413).

const { titleTooLong, titleTaken } = require("./list-edit");

// Services: "list-add-subtask", "list-subtask-commit", "list-subtask-cancel",
// dispatched from onUiEvent's switch.
module.exports = {
  getInlineSubtask() {
    return this._inlineSubtask || null;
  },

  // Expands the parent too: the creator sits after its children, so a
  // collapsed parent would hide where the new row lands.
  _openInlineSubtask(trigger) {
    const parentId = trigger.mget("taskId");
    if (!parentId) return;
    this._subtasksOpen.add(parentId);
    this._inlineSubtask = { parentId, busy: false };
    return this._refreshViewBody();
  },

  async _commitInlineSubtask() {
    const st = this._inlineSubtask;
    if (!st || st.busy) return;
    const input = this._inlineSubtaskInput();
    const title = String((input && input.value) || "").trim();
    if (!title) return this._closeInlineSubtask();
    if (titleTooLong(title)) return this._flagInlineSubtask("toolong");
    if (titleTaken(title, this.getSubtasks(st.parentId))) {
      return this._flagInlineSubtask("duplicate");
    }

    const cols = this.getColumns();
    const firstOpen = cols.find((c) => !c.is_done) || cols[0];
    st.busy = true;
    try {
      const row = await this._postSubtask(st.parentId, {
        title,
        priority: "medium",
        status: firstOpen ? firstOpen.key : "todo",
      });
      // Failed: keep the creator and what was typed; _postSubtask alerted.
      if (!row) return;
      // _postSubtask already repainted the view with the new child; this one
      // drops the creator row. A user who wants another presses ＋ again.
      if (this._inlineSubtask === st) this._closeInlineSubtask();
    } finally {
      st.busy = false;
    }
  },

  _closeInlineSubtask() {
    if (!this._inlineSubtask) return;
    this._inlineSubtask = null;
    return this._refreshViewBody();
  },

  _inlineSubtaskInput() {
    const pfx = this.fig.family;
    return this.el && this.el.querySelector(`.${pfx}__list-subcreate input`);
  },

  // `flag` is the row's data-* key: toolong | duplicate.
  _flagInlineSubtask(flag) {
    const input = this._inlineSubtaskInput();
    const row = input && input.closest(`.${this.fig.family}__list-subcreate-row`);
    if (row) row.dataset[flag] = "1";
    if (input) input.focus();
  },

  // Native wiring for the creator's input: focus, Enter commits, Esc cancels,
  // and leaving it empty cancels. Bound once per mounted input (a reconcile
  // keeps it across repaints). Called after every view-host paint.
  _wireInlineSubtask() {
    const input = this._inlineSubtaskInput();
    if (!input || input._subWired) return;
    input._subWired = 1;
    input.focus();
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this._closeInlineSubtask();
        return;
      }
      // An IME composition commits its candidate on Enter.
      if (e.key !== "Enter" || e.isComposing) return;
      e.preventDefault();
      e.stopPropagation();
      this._commitInlineSubtask();
    });
    input.addEventListener("input", () => {
      const row = input.closest(`.${this.fig.family}__list-subcreate-row`);
      if (row && row.dataset.toolong === "1") row.dataset.toolong = "0";
      if (row && row.dataset.duplicate === "1") row.dataset.duplicate = "0";
    });
    input.addEventListener("blur", () => {
      const st = this._inlineSubtask;
      if (st && !st.busy && !input.value.trim()) this._closeInlineSubtask();
    });
  },
};
