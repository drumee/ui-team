// List view inline editing — the panel half (Figma "Task List Inline Edit",
// 741:92816). Mixed into __tasks_panel's prototype at the bottom of index.js,
// so `this` is the panel.
//
// State: `_listEdit` — the ONE open editor, `{ id, field, … }` or null. A user
// has at most one cell open across the whole table; opening another replaces
// it. `_listSelected` — the ticked rows, for "Remove selected".
//
// Every write goes through the services the detail card already uses
// (list-edit.js fieldPatch) and is OPTIMISTIC: the cache is patched and the
// row repainted before the request, then reconciled with the server's row, or
// reverted with a network alert if the write did not land. The server re-checks
// the member's rights on every write (acl/task.json), whatever the client sent.
//
// Repaints go through _refreshViewBody (reconcile.js patches only the row and
// the editor that changed) — never _render(); see tasks-panel-render-paths.

const { rowOf, ownedPatch } = require("./live-sync");
const { contentTokenRe } = require("./mention-markers");
const {
  TEXT_FIELDS,
  fieldPatch,
  toggleUid,
  parseDateInput,
  shiftMonth,
  describePeerChange,
} = require("./list-edit");
const { showTaskToast, isToastMuted } = require("./task-toast");

const POP = ".tasks-panel__list-pop";

// Every service the list's cells and editor declare. onUiEvent hands these
// straight to _onListUiEvent.
const LIST_SERVICES = new Set([
  "list-edit",
  "list-edit-cancel",
  "list-edit-save",
  "list-set-priority",
  "list-set-status",
  "list-set-reporter",
  "list-toggle-assignee",
  "list-unassign",
  "list-date-step",
  "list-date-pick",
  "list-date-done",
  "list-toggle-file",
  "list-pop-search",
  "list-select",
  "list-select-all",
  "list-remove-selected",
  "list-reload",
]);

const today = () => Dayjs().format("YYYY-MM-DD");

module.exports = {
  LIST_SERVICES,

  // ── Accessors the skeleton reads ────────────────────────────────────────
  getListEdit() {
    return this._listEdit || null;
  },

  getTask(id) {
    return (this._tasks || []).find((t) => t.id === id) || null;
  },

  mayEditList() {
    return this._mayWriteTasks();
  },

  isListSelected(id) {
    return !!(this._listSelected && this._listSelected.has(id));
  },

  // A ticked row counts only while the list can still show it: a peer may
  // have deleted it, or a filter hidden it — "Remove selected" must never
  // delete a task the user cannot see.
  _listSelectable(id) {
    const t = this.getTask(id);
    if (!t) return false;
    return this.isSubtask(t) || this._matchesFilter(t);
  },

  getListSelectedCount() {
    if (!this._listSelected || !this._listSelected.size) return 0;
    let n = 0;
    for (const id of this._listSelected) if (this._listSelectable(id)) n++;
    return n;
  },

  // ── Events ──────────────────────────────────────────────────────────────
  _onListUiEvent(service, trigger, args = {}) {
    const edit = this._listEdit;
    switch (service) {
      case "list-edit":
        return this._openListEdit(trigger.mget("taskId"), trigger.mget("listField"));
      case "list-edit-cancel":
        return this._closeListEdit();
      case "list-edit-save":
        return this._saveListText();
      case "list-set-priority":
        if (!edit) return;
        return this._commitListField(edit.id, "priority", trigger.mget("taskPriority"), {
          close: true,
        });
      case "list-set-status":
        if (!edit) return;
        return this._commitListField(edit.id, "status", trigger.mget("taskStatus"), {
          close: true,
        });
      case "list-set-reporter":
        if (!edit) return;
        return this._commitListField(edit.id, "reporter", trigger.mget("memberUid"), {
          close: true,
        });
      case "list-toggle-assignee": {
        // Multi-select: the popover stays open and the chips update behind it.
        if (!edit) return;
        const task = this.getTask(edit.id);
        if (!task) return;
        const next = toggleUid(this.getKnownAssignees(task), trigger.mget("memberUid"));
        return this._commitListField(edit.id, "assignees", next);
      }
      case "list-unassign": {
        // The ✕ on a chip, straight from the cell — no popover needed.
        const id = trigger.mget("taskId");
        const task = this.getTask(id);
        if (!task) return;
        const uid = String(trigger.mget("memberUid"));
        const next = this.getKnownAssignees(task).map(String).filter((u) => u !== uid);
        return this._commitListField(id, "assignees", next);
      }
      case "list-date-step":
        if (!edit || !edit.month) return;
        edit.month = shiftMonth(edit.month, +trigger.mget("stepDir") || 0);
        return this._listRepaint();
      case "list-date-pick":
        // Picking only moves the selection; Done commits (Figma has both).
        if (!edit) return;
        edit.value = trigger.mget("dateValue") || "";
        edit.typed = null;
        return this._listRepaint();
      case "list-date-done":
        return this._commitListDate();
      case "list-toggle-file":
        if (!edit) return;
        return this._toggleListFile(edit.id, trigger.mget("fileNid"));
      case "list-pop-search":
        return this._onListSearch(trigger);
      case "list-select": {
        const id = trigger.mget("taskId");
        if (!id) return;
        if (!this._listSelected) this._listSelected = new Set();
        if (this._listSelected.has(id)) this._listSelected.delete(id);
        else this._listSelected.add(id);
        return this._listRepaint();
      }
      case "list-select-all": {
        // The rows that are BUILT — a box ticking rows past the render window
        // would delete tasks the user never saw.
        const ids = Array.from(
          this.el.querySelectorAll('.tasks-panel__list-row[data-sub="0"]'),
        ).map((el) => el.dataset.tid);
        if (!this._listSelected) this._listSelected = new Set();
        const every = ids.length && ids.every((id) => this._listSelected.has(id));
        if (every) ids.forEach((id) => this._listSelected.delete(id));
        else ids.forEach((id) => this._listSelected.add(id));
        return this._listRepaint();
      }
      case "list-remove-selected":
        return this._removeListSelected();
      case "list-reload": {
        const el = trigger && trigger.el;
        if (el) el.dataset.loading = "1";
        return this._loadTasks()
          .then(() => this._repaintBoard())
          .finally(() => {
            if (el) el.dataset.loading = "0";
          });
      }
      default:
        return;
    }
  },

  // ── Open / close ────────────────────────────────────────────────────────
  _openListEdit(id, field) {
    if (!id || !field || !this.mayEditList()) return;
    const task = this.getTask(id);
    if (!task) return;
    // A second click on the open cell closes it.
    if (this._listEdit && this._listEdit.id === id && this._listEdit.field === field) {
      return this._closeListEdit();
    }
    // A description holding mention chips or inline images cannot round-trip
    // through a plain text box — hand it to the detail card's rich editor.
    if (field === "description" && contentTokenRe().test(task.description || "")) {
      this._closeListEdit({ silent: true });
      return this._openDetail(id);
    }
    const edit = { id, field };
    if (TEXT_FIELDS.includes(field)) edit.initial = String(task[field] || "");
    if (field === "start_date" || field === "due_date") {
      edit.value = task[field] ? String(task[field]).slice(0, 10) : "";
      edit.month = (edit.value || today()).slice(0, 7);
    }
    if (field === "files") {
      edit.files = [];
      edit.loading = true;
      edit.query = "";
    }
    this._listEdit = edit;
    this._listRepaint();
    if (field === "files") this._runListFileSearch("");
  },

  _closeListEdit({ silent = false } = {}) {
    if (!this._listEdit) return;
    this._listEdit = null;
    if (this._listSearchTimer) clearTimeout(this._listSearchTimer);
    this._listSearchTimer = null;
    if (!silent) this._listRepaint();
  },

  // ── Commit ──────────────────────────────────────────────────────────────
  async _commitListField(id, field, value, { close = false } = {}) {
    const task = this.getTask(id);
    if (!task) return;
    const plan = fieldPatch(task, field, value);
    if (!plan) {
      if (close) this._closeListEdit();
      return;
    }
    if (plan.error) {
      // An empty title: say so and stay in edit mode.
      if (this._listEdit) this._listEdit.error = plan.error;
      return this._listRepaint();
    }
    const before = { id };
    for (const k of Object.keys(plan.local)) before[k] = task[k];
    this._mergeTask({ id, ...plan.local });
    if (close) this._listEdit = null;
    this._listRepaint();

    const resp = await this.postService({
      service: plan.service,
      hub_id: this._hubId,
      id,
      ...plan.args,
    }).catch(() => undefined);
    const row = rowOf(resp);
    if (!row) {
      // Never leave an unsaved value on screen: back to the last good one.
      this._mergeTask(before);
      this._repaintBoard();
      Wm.alert(LOCALE.ERROR_NETWORK);
      return;
    }
    // Only the fields this call owns — see OWNED in live-sync.js.
    this._mergeTask(ownedPatch(plan.service, row));
    if (row.parent) {
      // A status write can auto-complete the parent.
      this._mergeTask(row.parent);
      this._syncSubtaskBadges(row.parent.id);
    }
    if (row.parent_task_id) this._syncSubtaskBadges(row.parent_task_id);
    this._repaintBoard();
  },

  _listInputEl() {
    const pop = this.el && this.el.querySelector(POP);
    return pop ? pop.querySelector("textarea, input") : null;
  },

  _saveListText() {
    const edit = this._listEdit;
    if (!edit || !TEXT_FIELDS.includes(edit.field)) return;
    const input = this._listInputEl();
    if (!input) return;
    return this._commitListField(edit.id, edit.field, input.value, { close: true });
  },

  _commitListDate() {
    const edit = this._listEdit;
    if (!edit) return;
    const input = this.el && this.el.querySelector(`${POP} input[name="list-date-input"]`);
    let value = edit.value || "";
    if (input) {
      const raw = String(input.value || "").trim();
      if (!raw) value = "";
      else if (parseDateInput(raw)) value = parseDateInput(raw);
    }
    return this._commitListField(edit.id, edit.field, value, { close: true });
  },

  // Link / unlink one file straight away; the popover stays open.
  async _toggleListFile(id, nid) {
    const task = this.getTask(id);
    if (!task || !nid) return;
    const files = Array.isArray(task.linked_files) ? task.linked_files : [];
    const on = files.some((f) => String(f.file_nid) === String(nid));
    const pick = ((this._listEdit && this._listEdit.files) || []).find(
      (r) => String(r.nid) === String(nid),
    );
    this._mergeTask({
      id,
      linked_files: on
        ? files.filter((f) => String(f.file_nid) !== String(nid))
        : [
            ...files,
            { file_nid: nid, filename: pick ? pick.filename : "", extension: pick ? pick.ext : "" },
          ],
    });
    this._listRepaint();
    const resp = await this.postService({
      service: on ? SERVICE.task.unlink_file : SERVICE.task.link_file,
      hub_id: this._hubId,
      task_id: id,
      file_nid: nid,
    }).catch(() => undefined);
    if (!resp) {
      this._mergeTask({ id, linked_files: files });
      this._repaintBoard();
      Wm.alert(LOCALE.ERROR_NETWORK);
      return;
    }
    // link_file answers with the task's full list as of the insert.
    if (!on && Array.isArray(resp)) this._mergeTask({ id, linked_files: resp });
    // The detail card re-reads attachments when it opens; drop the stale copy.
    if (this._attachments) delete this._attachments[id];
    this._repaintBoard();
  },

  // ── Popover search ──────────────────────────────────────────────────────
  _onListSearch(trigger) {
    const edit = this._listEdit;
    if (!edit) return;
    const input = trigger && trigger.el && trigger.el.querySelector("input");
    const q = String((input && input.value) || "").trim();
    edit.query = q;
    if (edit.field === "files") {
      if (this._listSearchTimer) clearTimeout(this._listSearchTimer);
      // One letter is too short to be useful — same rule as the card's search.
      if (q.length === 1) return;
      this._listSearchTimer = setTimeout(() => this._runListFileSearch(q), 250);
      return;
    }
    this._filterListMembers();
  },

  // Members are all in the popover already: filter in place, no repaint.
  _filterListMembers() {
    const edit = this._listEdit;
    const pop = this.el && this.el.querySelector(POP);
    if (!edit || !pop) return;
    const q = String(edit.query || "").toLowerCase();
    pop.querySelectorAll(".tasks-panel__list-pop-member").forEach((el) => {
      el.dataset.hidden = q && !String(el.dataset.name || "").includes(q) ? "1" : "0";
    });
  },

  async _runListFileSearch(query) {
    const edit = this._listEdit;
    if (!edit || edit.field !== "files") return;
    edit.loading = true;
    let rows = [];
    try {
      rows = await this.fetchService({
        service: SERVICE.task.search_files,
        hub_id: this._hubId,
        pattern: query,
        task_id: edit.id,
        page: 1,
      });
    } catch (e) {
      rows = [];
    }
    // The popover moved on (closed, another cell, a newer query) meanwhile.
    if (this._listEdit !== edit || (edit.query || "") !== query) return;
    // One row comes back as an object, not a one-element array.
    edit.files = Array.isArray(rows) ? rows : rows && rows.nid ? [rows] : [];
    edit.loading = false;
    this._listRepaint();
  },

  // ── Bulk remove ─────────────────────────────────────────────────────────
  async _removeListSelected() {
    const ids = Array.from(this._listSelected || []).filter((id) => this._listSelectable(id));
    if (!ids.length) return;
    ids.forEach((id) => this._markTaskEls(id, "pending", true));
    let failed = 0;
    for (const id of ids) {
      const doomed = this.getTask(id);
      // Already gone with a parent deleted earlier in this loop (cascade).
      if (!doomed) {
        this._listSelected.delete(id);
        continue;
      }
      const parent = (doomed && doomed.parent_task_id) || null;
      const resp = await this.postService({
        service: SERVICE.task.delete,
        hub_id: this._hubId,
        id,
      }).catch(() => undefined);
      if (resp && (resp.affected >= 1 || resp.id === id)) {
        // A deleted parent takes its children with it server-side.
        const gone = new Set([id, ...(resp.subtask_ids || [])]);
        this._tasks = this._tasks.filter((t) => !gone.has(t.id));
        this._subtasksOpen.delete(id);
        if (parent) this._syncSubtaskBadges(parent);
        if (this._listEdit && gone.has(this._listEdit.id)) this._listEdit = null;
      } else {
        failed++;
        this._markTaskEls(id, "pending", false);
      }
      this._listSelected.delete(id);
    }
    this._repaintBoard();
    if (failed) Wm.alert(LOCALE.ERROR_NETWORK);
  },

  // ── Paint, placement, keyboard ──────────────────────────────────────────
  _listRepaint() {
    if (this.getView() !== "list") return;
    this._refreshViewBody({ enter: false });
    this._afterListPaint();
  },

  // _refreshViewBody patches asynchronously (part lookup + FLIP), so place the
  // editor two frames later, once the patched rows have their final geometry.
  _afterListPaint() {
    if (this._listPaintRaf) return;
    const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (f) => setTimeout(f, 16);
    this._listPaintRaf = raf(() =>
      raf(() => {
        this._listPaintRaf = 0;
        if (this.isDestroyed && this.isDestroyed()) return;
        this._positionListPop();
        this._wireListEditor();
        this._filterListMembers();
      }),
    );
  },

  _positionListPop() {
    const wrap = this.el && this.el.querySelector(".tasks-panel__list-wrap");
    const pop = wrap && wrap.querySelector(POP);
    if (!pop) return;
    const key = pop.dataset.anchor || "";
    const anchor = Array.from(wrap.querySelectorAll("[data-cell]")).find(
      (el) => el.dataset.cell === key,
    );
    if (!anchor) {
      // The row went away (filtered out, deleted by a peer): nothing to edit.
      return this._closeListEdit();
    }
    const w = wrap.getBoundingClientRect();
    const a = anchor.getBoundingClientRect();
    const scroller = wrap.querySelector(".tasks-panel__list");
    const s = scroller ? scroller.getBoundingClientRect() : w;
    // Scrolled out of sight: hide rather than float over the header.
    if (a.bottom < s.top + 48 || a.top > s.bottom) {
      pop.dataset.placed = "0";
      return;
    }
    const kind = pop.dataset.kind;
    let left = a.left - w.left;
    let top;
    if (TEXT_FIELDS.includes(kind)) {
      // The editor covers the row's cell (Figma: 516 wide for the title,
      // spanning into Priority; 344 for the description, spanning Files).
      const row = anchor.closest(".tasks-panel__list-row") || anchor;
      const r = row.getBoundingClientRect();
      pop.style.width = `${kind === "title" ? 516 : 344}px`;
      top = r.top - w.top + (r.height - pop.offsetHeight) / 2;
    } else {
      pop.style.width = "";
      top = a.bottom - w.top + 4;
      // Not enough room below: open upwards.
      if (top + pop.offsetHeight > w.height - 8 && a.top - w.top - pop.offsetHeight - 4 > 0) {
        top = a.top - w.top - pop.offsetHeight - 4;
      }
    }
    // Keep it inside the table; the last columns right-align instead.
    const maxLeft = w.width - pop.offsetWidth - 8;
    if (left > maxLeft) left = Math.max(8, Math.min(maxLeft, a.right - w.left - pop.offsetWidth));
    pop.style.left = `${Math.max(0, left)}px`;
    pop.style.top = `${Math.max(0, top)}px`;
    pop.dataset.placed = "1";
  },

  // Native wiring for the editor's inputs: focus, caret at the end, Enter /
  // Esc. Bound once per mounted element (a reconcile keeps it across repaints).
  _wireListEditor() {
    const edit = this._listEdit;
    const pop = this.el && this.el.querySelector(POP);
    if (!edit || !pop) return;
    const text = TEXT_FIELDS.includes(edit.field);
    const input = text
      ? pop.querySelector("textarea, input")
      : pop.querySelector('input[name="list-date-input"], input[name="list-pop-search"]');
    if (!input || input._listWired) return;
    input._listWired = 1;
    if (text && !input.value && edit.initial) {
      // ui-core seeds an Entry's value a beat after mount; do not wait for it.
      input.value = edit.initial;
    }
    input.focus();
    if (text && input.setSelectionRange) {
      const end = input.value.length;
      input.setSelectionRange(end, end);
    }
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this._closeListEdit();
        return;
      }
      if (e.key !== "Enter") return;
      // Shift+Enter is a new line in the description.
      if (edit.field === "description" && e.shiftKey) return;
      e.preventDefault();
      e.stopPropagation();
      if (text) this._saveListText();
      else if (input.name === "list-date-input") this._commitListDate();
    });
  },

  // Click outside → cancel (no write: that path is free). Esc anywhere → cancel.
  // Scrolling the table keeps the editor under its cell.
  _installListEdit() {
    if (this._listEditInstalled || !this.el) return;
    this._listEditInstalled = 1;
    this._onListDocDown = (e) => {
      if (!this._listEdit) return;
      const t = e.target;
      if (!t || !t.closest) return;
      if (t.closest(POP)) return;
      // Another cell of this list: its own service opens (or closes) it.
      if (this.el.contains(t) && t.closest(".tasks-panel__list [data-cell]")) return;
      this._closeListEdit();
    };
    this._onListDocKey = (e) => {
      if (e.key === "Escape" && this._listEdit) this._closeListEdit();
    };
    document.addEventListener("mousedown", this._onListDocDown, true);
    document.addEventListener("keydown", this._onListDocKey);
    this.el.addEventListener(
      "scroll",
      (e) => {
        if (!this._listEdit) return;
        const t = e.target;
        if (t && t.classList && t.classList.contains("tasks-panel__list")) {
          this._positionListPop();
        }
      },
      true,
    );
  },

  _uninstallListEdit() {
    if (this._onListDocDown) document.removeEventListener("mousedown", this._onListDocDown, true);
    if (this._onListDocKey) document.removeEventListener("keydown", this._onListDocKey);
    this._onListDocDown = null;
    this._onListDocKey = null;
    if (this._listSearchTimer) clearTimeout(this._listSearchTimer);
    this._listEdit = null;
  },

  // ── "Updated by" toast ──────────────────────────────────────────────────
  // A peer's write landed on a task this list shows. Never for my own write
  // (another tab of mine included): the optimistic value was already right.
  _toastPeerListEdit(service, prev, patch, options = {}) {
    try {
      if (this.getView() !== "list" || this._isPanelHidden()) return;
      const sender = (options && options.sender) || null;
      if (!sender) return;
      const sid = sender.uid || sender.id;
      if (!sid || String(sid) === String(Visitor.id)) return;
      if (isToastMuted(this._hubId)) return;
      const cols = this.getColumns();
      const text = describePeerChange(service, prev, patch, {
        t: {
          renamed: LOCALE.TASK_TOAST_RENAMED,
          priority: LOCALE.TASK_TOAST_PRIORITY,
          status: LOCALE.TASK_TOAST_STATUS,
          start: LOCALE.TASK_TOAST_START,
          due: LOCALE.TASK_TOAST_DUE,
          description: LOCALE.TASK_TOAST_DESCRIPTION,
          reporter: LOCALE.TASK_TOAST_REPORTER,
          assigned: LOCALE.TASK_TOAST_ASSIGNED,
          assignedOne: LOCALE.TASK_TOAST_ASSIGNED_ONE,
          assignees: LOCALE.TASK_TOAST_ASSIGNEES,
          files: LOCALE.TASK_TOAST_FILES,
          unlinked: LOCALE.TASK_TOAST_UNLINKED,
        },
        priorityName: (k) => {
          const p = this.getPriorities().find((x) => x.key === k);
          return p ? LOCALE[p.label] || k : k;
        },
        statusName: (k) => {
          const c = cols.find((x) => x.key === k);
          return c ? c.name || LOCALE[c.label] || k : k;
        },
      });
      if (!text) return;
      showTaskToast(this, {
        sender,
        name: this._wsActorName(options),
        message: text,
        taskId: patch.id,
      });
    } catch (e) {
      console.warn("[tasks_panel] list toast failed:", e);
    }
  },
};
