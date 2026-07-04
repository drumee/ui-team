const { uploadFile } = require("@drumee/ui-essentials");
const { markerRe, uidsFromText } = require("./mention-markers");

// 10-swatch column palette (Figma 2040-106090). Dot/accent color per theme;
// the skin derives the column tint from the accent (--col-accent) and pill
// tints from data-theme.
const COLUMN_THEMES = {
  default: "#AEAEB2",
  orange: "#E8A13B",
  yellow: "#EFC443",
  green: "#54B684",
  cyan: "#65D0EA",
  blue: "#71A3F4",
  purple: "#847EFF",
  pink: "#FFA8DC",
  red: "#D74E49",
};

// Built-in columns — always present, not editable. User-created columns come
// from the server (task.column_list) and follow these on the board; a custom
// column's id doubles as the task.status key.
const COLUMNS = [
  { key: "todo", label: "STATUS_TODO", color: "#AEAEB2", theme: "default" },
  {
    key: "in_progress",
    label: "STATUS_IN_PROGRESS",
    color: "#5950FF",
    theme: "purple",
  },
  {
    key: "to_review",
    label: "STATUS_TO_REVIEW",
    color: "#E8A13B",
    theme: "orange",
  },
  {
    key: "complete",
    label: "STATUS_COMPLETE",
    color: "#54B684",
    theme: "green",
  },
];

// Signal palette (Figma): Success / Info / Warning / Error — must match the
// skin's [data-priority] pill colors so dots and pills agree everywhere.
const PRIORITIES = [
  { key: "low", label: "PRIORITY_LOW", color: "#54B684" },
  { key: "medium", label: "PRIORITY_MEDIUM", color: "#71A3F4" },
  { key: "high", label: "PRIORITY_HIGH", color: "#E8A13B" },
  { key: "urgent", label: "PRIORITY_URGENT", color: "#D74E49" },
];

class __tasks_panel extends LetcBox {
  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    // LetcBox auto-binds fetchService/postService but not uploadFile.
    this.uploadFile = uploadFile.bind(this);
    this._hubId = this.mget(_a.hub_id) || Host.get(_a.id);
    // Upload destination — must be a real folder/home node, not the hub_id.
    // The folder window passes `actual_home_id || nid` when launching us.
    this._destNid = this.mget(_a.actual_home_id) || this.mget(_a.nid) || 0;
    // Folder scope for the task list/create. `scope_nid` is the canonical
    // current-directory node (root window → actual_home_id, subfolder → own
    // nid); `scope_is_root` makes the root view also show legacy nid-less
    // tasks. Falls back to _destNid for safety if not supplied.
    this._scopeNid = this.mget("scope_nid") || this._destNid || null;
    this._scopeIsRoot = this.mget("scope_is_root") ? 1 : 0;
    this._tasks = [];
    this._members = [];
    this._labels = [];
    this._creating = false;
    this._createDefaults = null;
    this._detailId = null;
    this._detailDraft = null;
    this._attachments = {};
    this._pickerOpen = null;
    // Member filter — empty = show all. Uids stored as strings.
    this._filterUids = [];
    // Active sub-view (board | calendar | list | summary) and the List view's
    // sort state.
    this._view = "board";
    this._sort = null; // { key, dir } — null = natural (status, rank) order
    // Calendar view: month|week granularity + the anchor date (YYYY-MM-DD) of
    // the displayed period. null cursor = today.
    this._calMode = "month";
    this._calCursor = null;
    // Gantt view: weeks|months axis granularity + the multi-select set (task
    // ids) backing the checkboxes / "Delete selected".
    this._ganttMode = "weeks";
    this._ganttSelected = new Set();
    // Custom Kanban columns (server rows {id,name,theme,position}) + the
    // board's add-column / column-menu UI state.
    this._customColumns = [];
    this._colAddOpen = false;
    this._colAddTheme = "default";
    this._colMenuFor = null; // custom column id whose menu popover is open
    this._fileSearch = { query: "", results: [], scope: null };
    this._fileSearchTimer = null;
    this._fileSearchBlurTimer = null;
    // Active @-mention session (null when the popup is closed): the "@token"
    // range in the focused description editor + the filtered member list.
    this._mention = null;
    // Recent-activity feed for the Project Health view (folder-scoped).
    this._activity = [];
    // Comment feed state for the open task detail.
    this._comments = [];
    this._commentDraft = null; // composer buffer { body, mention_uids }
    this._editingCommentId = null;
    this._commentEditDraft = null; // inline-edit buffer { body, mention_uids }
    this._replyingTo = null; // root comment id whose reply composer is open
    this._replyDraft = null; // reply buffer { body, mention_uids }
    this._reactPickerFor = null; // comment id whose reaction palette is open
    this.bindEvent(_a.live);
  }

  onBeforeDestroy() {
    this.unbindEvent(_a.live);
    if (this._fileSearchTimer) clearTimeout(this._fileSearchTimer);
    if (this._fileSearchBlurTimer) clearTimeout(this._fileSearchBlurTimer);
    if (
      this._mediaDroppableInstalled &&
      typeof $ !== "undefined" &&
      $.fn &&
      $.fn.droppable &&
      this.el
    ) {
      try {
        $(this.el).droppable("destroy");
      } catch (_) {}
    }
    // Release pending-file image-preview blob URLs.
    for (const draft of [this._createDefaults, this._detailDraft]) {
      for (const f of (draft && draft.pending_files) || []) {
        if (f.previewUrl) {
          try {
            URL.revokeObjectURL(f.previewUrl);
          } catch (_) {}
        }
      }
    }
  }

  // ── Host-window controls (filter button lives on the tab bar) ──
  // Toggle the member-filter dropdown (rendered top-right of the board).
  toggleFilter() {
    this._pickerOpen = this._pickerOpen === "filter" ? null : "filter";
    this._render();
  }

  isFilterActive() {
    return (this._filterUids || []).length > 0;
  }

  // Let the host window reflect the active filter on its tab-bar button.
  _notifyFilterState() {
    if (typeof this.triggerHandlers === "function") {
      this.triggerHandlers({
        service: "task-filter-state",
        active: this.isFilterActive() ? 1 : 0,
      });
    }
  }

  // Re-point the panel at a different folder when the host window navigates
  // (breadcrumb / into a child). Mirrors the chat panel's setScopedFolderNid.
  setScope({ scopeNid = null, isRoot = 0, destNid } = {}) {
    const nextScope = scopeNid != null ? scopeNid : null;
    const nextRoot = isRoot ? 1 : 0;
    const nextDest = destNid != null ? destNid : this._destNid;
    if (
      this._scopeNid === nextScope &&
      this._scopeIsRoot === nextRoot &&
      this._destNid === nextDest
    ) {
      return;
    }
    this._scopeNid = nextScope;
    this._scopeIsRoot = nextRoot;
    this._destNid = nextDest;
    // The create/detail popups and any pending file search belong to the
    // folder we just left — close them so nothing commits into the new scope.
    this._creating = false;
    this._createDefaults = null;
    this._detailId = null;
    this._detailDraft = null;
    this._pickerOpen = null;
    if (typeof this._resetFileSearch === "function") this._resetFileSearch();
    if (!this.el) return; // not mounted yet — onDomRefresh loads fresh
    Promise.all([this._loadTasks(), this._loadColumns()]).then(() =>
      this._render(),
    );
  }

  async onDomRefresh() {
    this._installDnd();
    this._installMediaDroppable();
    this._installFileSearchFocus();
    await Promise.all([
      this._loadTasks(),
      this._loadColumns(),
      this._loadActivity(),
      this._loadMembers(),
      this._loadLabels(),
    ]);
    this._render();
  }

  // Files dragged from the home grid use Drumee's internal jQuery-UI drag, not
  // native dataTransfer — register the panel as a droppable so they attach.
  _installMediaDroppable() {
    if (!this.el || this._mediaDroppableInstalled) return;
    if (typeof $ === "undefined" || !$.fn || !$.fn.droppable) return;
    this._mediaDroppableInstalled = true;
    $(this.el).droppable({
      tolerance: "pointer",
      greedy: true,
      over: () => {
        if (this.canAttachExisting()) this.el.dataset.fileDrag = "1";
      },
      out: () => {
        delete this.el.dataset.fileDrag;
      },
      drop: (e, ui) => {
        delete this.el.dataset.fileDrag;
        if (!this.canAttachExisting()) return;
        const selection =
          (typeof Wm !== "undefined" &&
            Wm.getGlobalSelection &&
            Wm.getGlobalSelection()) ||
          [];
        const moving = ui && ui.helper && ui.helper.moving;
        const nodes = selection.length ? selection : moving ? [moving] : [];
        if (nodes.length) this.attachExistingNodes(nodes);
      },
    });
  }

  // Delegated drag-and-drop on this.el — survives every _render()'s feed() rebuild.
  _installDnd() {
    if (!this.el || this._dndInstalled) return;
    this._dndInstalled = true;
    const root = this.el;

    const findCard = (target) => {
      if (!target || !target.closest) target = target && target.parentElement;
      if (!target || !target.closest) return null;
      const n = target.closest(".tasks-panel__task-card");
      return n && root.contains(n) ? n : null;
    };
    const findColumn = (target) => {
      if (!target || !target.closest) target = target && target.parentElement;
      if (!target || !target.closest) return null;
      const n = target.closest("[data-dropcol]");
      return n && root.contains(n) ? n : null;
    };

    root.addEventListener("dragstart", (e) => {
      const card = findCard(e.target);
      if (!card) return;
      const tid = card.dataset.tid;
      if (!tid) return;
      this._dragTaskId = tid;
      card.classList.add("is-dragging");
      try {
        e.dataTransfer.setData("text/plain", tid);
        e.dataTransfer.effectAllowed = "move";
      } catch (_) {
        /* ignore */
      }
    });

    root.addEventListener("dragend", (e) => {
      const card = findCard(e.target);
      if (card) card.classList.remove("is-dragging");
      this._dragTaskId = null;
      this._clearDropAffordance();
    });

    root.addEventListener("dragover", (e) => {
      // OS file drag → attach to the open task; preventDefault so the drop
      // fires on us. Takes priority over the card-reorder path.
      if (this._isFileDrag(e)) {
        e.preventDefault();
        const ok = !!this._activeUploadScope();
        try {
          e.dataTransfer.dropEffect = ok ? "copy" : "none";
        } catch (_) {}
        if (ok) root.dataset.fileDrag = "1";
        return;
      }
      const col = findColumn(e.target);
      if (!col) return;
      e.preventDefault();
      try {
        e.dataTransfer.dropEffect = "move";
      } catch (_) {}
      root
        .querySelectorAll(".tasks-panel__column-body.is-drop-target")
        .forEach((n) => {
          if (n !== col) n.classList.remove("is-drop-target");
        });
      col.classList.add("is-drop-target");
      // Show a placeholder at the exact insertion point so the drop reads as
      // precise (Jira/Trello-style) rather than "somewhere in this column".
      const ph = this._ensurePlaceholder();
      const after = this._dragAfterCard(col, e.clientY);
      if (after) {
        if (after.previousElementSibling !== ph) col.insertBefore(ph, after);
      } else if (col.lastElementChild !== ph) {
        col.appendChild(ph);
      }
    });

    root.addEventListener("dragleave", (e) => {
      if (root.dataset.fileDrag && !root.contains(e.relatedTarget)) {
        delete root.dataset.fileDrag;
      }
      const col = findColumn(e.target);
      // Only clear the highlight when the pointer actually leaves the column
      // body (relatedTarget outside it) — child→child transitions also fire
      // dragleave and would otherwise strobe the outline + placeholder.
      if (col && !col.contains(e.relatedTarget)) {
        col.classList.remove("is-drop-target");
      }
    });

    root.addEventListener("drop", (e) => {
      if (this._isFileDrag(e)) {
        e.preventDefault();
        delete root.dataset.fileDrag;
        return this._onFilesDropped(e);
      }
      const col = findColumn(e.target);
      if (!col) {
        this._clearDropAffordance();
        return;
      }
      e.preventDefault();
      const transferId = (() => {
        try {
          return e.dataTransfer.getData("text/plain");
        } catch (_) {
          return null;
        }
      })();
      const taskId = this._dragTaskId || transferId;
      const targetStatus = col.dataset.dropcol;
      // Resolve the insertion point BEFORE tearing down the placeholder.
      const afterEl = this._dragAfterCard(col, e.clientY);
      this._dragTaskId = null;
      this._clearDropAffordance();
      if (!taskId || !targetStatus) return;
      this._moveTaskTo(taskId, targetStatus, afterEl);
    });
  }

  // Lazily-created insertion placeholder shared across columns.
  _ensurePlaceholder() {
    if (this._placeholder) return this._placeholder;
    const ph = document.createElement("div");
    ph.className = "tasks-panel__card-placeholder";
    this._placeholder = ph;
    return ph;
  }

  // The card the dragged item should be inserted *before*, based on pointer Y.
  // null → append to the end of the column. Excludes the in-flight card and
  // the placeholder itself so geometry stays stable mid-drag.
  _dragAfterCard(colBody, y) {
    const cards = Array.from(
      colBody.querySelectorAll(".tasks-panel__task-card"),
    ).filter((c) => !c.classList.contains("is-dragging"));
    for (const c of cards) {
      const r = c.getBoundingClientRect();
      if (y < r.top + r.height / 2) return c;
    }
    return null;
  }

  _clearDropAffordance() {
    if (!this.el) return;
    this.el
      .querySelectorAll(".tasks-panel__column-body.is-drop-target")
      .forEach((n) => n.classList.remove("is-drop-target"));
    if (this._placeholder && this._placeholder.parentNode) {
      this._placeholder.parentNode.removeChild(this._placeholder);
    }
  }

  async _moveTaskTo(taskId, status, afterEl) {
    const task = this._tasks.find((t) => t.id === taskId);
    if (!task) return;
    const originalStatus = task.status;
    const sameColumn = originalStatus === status;

    const card =
      this.el &&
      this.el.querySelector(`.tasks-panel__task-card[data-tid="${taskId}"]`);
    const targetBody =
      this.el &&
      this.el.querySelector(
        `.tasks-panel__column-body[data-dropcol="${status}"]`,
      );

    // No-op: same column and dropped onto itself / its own slot.
    if (sameColumn && (!afterEl || afterEl === card)) return;

    // Fall back to a full render if we can't locate the DOM nodes (defensive).
    if (!card || !targetBody) {
      task.status = status;
      this._render();
    } else {
      const sourceBody = card.closest(".tasks-panel__column-body");
      card.classList.remove("is-dragging");
      // FLIP: capture every card's position, perform the DOM move, then animate
      // the deltas so the dragged card glides into place and siblings reflow
      // smoothly — instead of the whole board snapping after a re-render.
      this._animateMove(() => {
        if (afterEl && afterEl.parentNode === targetBody) {
          targetBody.insertBefore(card, afterEl);
        } else {
          targetBody.appendChild(card);
        }
        card.dataset.status = status;
        task.status = status;
      });
      // Refresh counts + empty-state on both affected columns in place.
      this._syncColumn(sourceBody);
      if (targetBody !== sourceBody) this._syncColumn(targetBody);
      // The card shows its column as a status pill — retint it in place too
      // (the drag path is surgical; nothing else re-renders the card).
      this._syncCardStatus(card, status);
    }

    // Reordering within the same column has no server-side rank to persist yet,
    // so skip the round-trip; the visual order holds until the next reload.
    if (sameColumn) return;

    try {
      const updated = await this.postService({
        service: SERVICE.task.update_status,
        hub_id: this._hubId,
        id: taskId,
        status,
      });
      this._mergeTask(Array.isArray(updated) ? updated[0] : updated);
    } catch (err) {
      console.error("[tasks_panel] update_status (drag) failed:", err);
      task.status = originalStatus;
      await this._loadTasks();
      this._render();
    }
  }

  // FLIP helper: run `mutate` (a synchronous DOM change), then transition each
  // card from its previous box to its new one. Cards with no delta are skipped.
  _animateMove(mutate) {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof requestAnimationFrame !== "function") {
      mutate();
      return;
    }
    const cards = Array.from(
      this.el.querySelectorAll(".tasks-panel__task-card"),
    );
    const first = new Map();
    cards.forEach((c) => first.set(c, c.getBoundingClientRect()));

    mutate();

    this.el.querySelectorAll(".tasks-panel__task-card").forEach((c) => {
      const f = first.get(c);
      if (!f) return; // card wasn't present before the move
      const l = c.getBoundingClientRect();
      const dx = f.left - l.left;
      const dy = f.top - l.top;
      if (!dx && !dy) return;
      if (Math.abs(dx) > 8) {
        // Crossed columns: a translate FLIP would be clipped by the column's
        // overflow (`overflow-y:auto` / `overflow:hidden`), so settle the card
        // in place with a quick pop rather than a clipped horizontal slide.
        // (Only the dragged card ever changes column; siblings move vertically.)
        c.style.animation = "tasks-panel-pop-in 0.18s cubic-bezier(0.2, 0, 0, 1)";
        const done = () => {
          c.style.animation = "";
          c.removeEventListener("animationend", done);
        };
        c.addEventListener("animationend", done);
      } else {
        c.style.transition = "none";
        c.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(() => {
          c.style.transition = "transform 0.18s cubic-bezier(0.2, 0, 0, 1)";
          c.style.transform = "";
        });
        const clear = () => {
          c.style.transition = "";
          c.style.transform = "";
          c.removeEventListener("transitionend", clear);
        };
        c.addEventListener("transitionend", clear);
      }
    });
  }

  // Keep a column's count badge and empty-state hint in sync after a surgical
  // card move (no full re-render). Mirrors what the skeleton renders initially.
  // Update a moved card's status pill (label / dot / theme tint) in place —
  // companion to _syncColumn for the surgical drag path.
  _syncCardStatus(card, statusKey) {
    if (!card) return;
    const col = this.getColumns().find((c) => c.key === statusKey);
    if (!col) return;
    const pill = card.querySelector(".tasks-panel__task-status");
    if (pill) pill.dataset.theme = col.theme || "default";
    const dot = card.querySelector(".tasks-panel__task-status-dot");
    if (dot) dot.style.background = col.color || "";
    const label = card.querySelector(".tasks-panel__task-status-label");
    if (label) label.textContent = col.name || "";
  }

  _syncColumn(colBody) {
    if (!colBody) return;
    const count = colBody.querySelectorAll(".tasks-panel__task-card").length;
    const countEl = colBody.querySelector(".tasks-panel__column-count-text");
    if (countEl) countEl.textContent = String(count);
    let empty = colBody.querySelector(".tasks-panel__column-empty");
    if (count === 0 && !empty) {
      empty = document.createElement("div");
      empty.className = "tasks-panel__column-empty";
      empty.textContent = LOCALE.DROP_TASKS_HERE || "";
      colBody.appendChild(empty);
    } else if (count > 0 && empty) {
      empty.remove();
    }
  }

  async onUiEvent(trigger, args = {}) {
    let service =
      args.service || (trigger && trigger.get && trigger.get(_a.service));
    // Drumee dispatches click on the deepest widget; if it has no service of
    // its own (e.g. a Note inside a card), walk up to find an ancestor that does.
    if (!service && trigger && trigger.parent) {
      let p = trigger.parent;
      let depth = 0;
      while (p && depth < 8) {
        const s = p.mget && p.mget(_a.service);
        if (s) {
          service = s;
          trigger = p;
          break;
        }
        p = p.parent;
        depth += 1;
      }
    }
    switch (service) {
      case "task-input-changed":
        return this._onTaskInputChanged(args, trigger);

      case "add-task":
        this._creating = true;
        this._createDefaults = {
          status: trigger.mget("taskColumn") || "todo",
          title: "",
          description: "",
          priority: "medium",
          due_date: "",
          assignees: [],
          labels: [],
          pending_files: [],
        };
        // Force a fresh fetch on first attachment pick so name-collision
        // preview reflects whatever the folder body holds right now.
        this._folderFilenames = null;
        this._resetFileSearch();
        return this._render();

      case "commit-task":
        if (this._submitting) return;
        return this._commitTask();

      case "cancel-add":
        this._creating = false;
        this._createDefaults = null;
        this._pickerOpen = null;
        this._resetFileSearch();
        return this._render();

      case "create-status":
        if (this._createDefaults) {
          const next = trigger.mget("taskStatus");
          this._createDefaults.status = next;
          this._updateStatusPills(
            ".tasks-panel__create-modal",
            ".tasks-panel__create-status-pill",
            next,
          );
        }
        return;

      case "create-priority":
        if (this._createDefaults) {
          const next = trigger.mget("taskPriority");
          this._createDefaults.priority = next;
          this._updatePriorityPills(".tasks-panel__create-modal", next);
        }
        return;

      case "create-assignee":
        if (this._createDefaults) {
          this._createDefaults.assignees = this._toggleAssignee(
            this._createDefaults.assignees,
            trigger.mget("memberUid"),
          );
          this._applyAssigneeChange("create-assignee", this._createDefaults.assignees);
        }
        return;

      case "create-toggle-label":
        if (this._createDefaults) {
          const id = trigger.mget("labelId");
          const set = new Set(this._createDefaults.labels);
          if (set.has(id)) set.delete(id);
          else set.add(id);
          this._createDefaults.labels = Array.from(set);
          this._updateLabelOptions(
            ".tasks-panel__create-modal",
            this._createDefaults.labels,
          );
        }
        return;

      case "toggle-picker": {
        const kind = trigger.mget("pickerKind");
        this._pickerOpen = this._pickerOpen === kind ? null : kind;
        this._applyPickerOpen(kind, this._pickerOpen === kind);
        return;
      }

      case "filter-member": {
        // Empty uid ("All members") clears; any other uid multi-toggles. The
        // dropdown stays open so several members can be picked in a row.
        const uid = trigger.mget("memberUid");
        if (!uid) this._filterUids = [];
        else this._filterUids = this._toggleAssignee(this._filterUids, uid);
        this._notifyFilterState();
        return this._render();
      }

      case "remove-task":
        return this._removeTask(trigger);

      case "toggle-complete":
        return this._toggleComplete(trigger);

      case "commit-description":
      case "commit-due-date":
        // Drafts stay in sync via the `task-input-changed` watch.
        return;

      case "set-status":
        if (this._detailDraft) {
          const next = trigger.mget("taskStatus");
          this._detailDraft.status = next;
          this._updateStatusPills(
            ".tasks-panel__detail-panel",
            ".tasks-panel__detail-status-pill",
            next,
          );
        }
        return;

      case "set-priority":
        if (this._detailDraft) {
          const next = trigger.mget("taskPriority");
          this._detailDraft.priority = next;
          this._updatePriorityPills(".tasks-panel__detail-panel", next);
        }
        return;

      case "set-assignee":
        if (this._detailDraft) {
          this._detailDraft.assignees = this._toggleAssignee(
            this._detailDraft.assignees,
            trigger.mget("memberUid"),
          );
          this._applyAssigneeChange("detail-assignee", this._detailDraft.assignees);
        }
        return;

      case "toggle-task-label":
        if (this._detailDraft) {
          const id = trigger.mget("labelId");
          const set = new Set(this._detailDraft.labels || []);
          if (set.has(id)) set.delete(id);
          else set.add(id);
          this._detailDraft.labels = Array.from(set);
          this._updateLabelOptions(
            ".tasks-panel__detail-panel",
            this._detailDraft.labels,
          );
        }
        return;

      case "commit-detail":
        if (this._submitting) return;
        return this._commitDetail();

      case "cancel-detail":
      case "close-detail":
        this._detailId = null;
        this._detailDraft = null;
        this._pickerOpen = null;
        this._comments = [];
        this._commentDraft = null;
        this._editingCommentId = null;
        this._commentEditDraft = null;
        this._replyingTo = null;
        this._replyDraft = null;
        this._reactPickerFor = null;
        this._resetFileSearch();
        return this._render();

      case "open-detail":
        return this._openDetail(trigger.mget("taskId"));

      case "set-view": {
        const v = trigger.mget("viewMode");
        if (v && v !== this._view) {
          this._view = v;
          this._render();
        }
        return;
      }

      case "set-cal-mode": {
        const m = trigger.mget("calMode") === "week" ? "week" : "month";
        if (m !== this._calMode) {
          this._calMode = m;
          this._render();
        }
        return;
      }

      case "cal-prev":
        return this._calShift(-1);

      case "cal-next":
        return this._calShift(1);

      case "cal-today":
        if (this._calCursor !== null) {
          this._calCursor = null;
          this._render();
        }
        return;

      case "cal-day-more": {
        // "+N more" on a packed month cell → jump to that day's week view.
        const day = trigger.mget("calDay");
        if (day) {
          this._calCursor = day;
          this._calMode = "week";
          this._render();
        }
        return;
      }

      case "cal-add": {
        // "+" on a day cell → open the create modal pre-dated to that day.
        const day = trigger.mget("calDay") || "";
        this._creating = true;
        this._createDefaults = {
          status: "todo",
          title: "",
          description: "",
          priority: "medium",
          due_date: day,
          assignees: [],
          labels: [],
          pending_files: [],
        };
        this._folderFilenames = null;
        this._resetFileSearch();
        return this._render();
      }

      case "set-gantt-mode": {
        const m = trigger.mget("ganttMode") === "months" ? "months" : "weeks";
        if (m !== this._ganttMode) {
          this._ganttMode = m;
          this._render();
        }
        return;
      }

      case "gantt-toggle-select": {
        const id = trigger.mget("taskId");
        if (!id) return;
        if (this._ganttSelected.has(id)) this._ganttSelected.delete(id);
        else this._ganttSelected.add(id);
        return this._render();
      }

      case "gantt-delete-selected":
        return this._deleteSelectedTasks();

      case "col-add-open":
        this._colAddOpen = true;
        this._colAddTheme = "default";
        this._colMenuFor = null;
        return this._render();

      case "col-add-cancel":
        this._colAddOpen = false;
        return this._render();

      case "col-add-theme":
        this._colAddTheme = trigger.mget("colTheme") || "default";
        return this._render();

      case "col-add-submit":
        return this._createColumn();

      case "col-menu": {
        const key = trigger.mget("taskColumn");
        this._colMenuFor = this._colMenuFor === key ? null : key;
        return this._render();
      }

      case "col-rename-submit":
        return this._renameColumn(trigger);

      case "col-theme-set":
        return this._themeColumn(trigger);

      case "col-delete":
        return this._deleteColumn(trigger);

      case "set-sort": {
        // Toggle direction when re-selecting the same column, else sort asc.
        const key = trigger.mget("sortKey");
        if (!key) return;
        if (this._sort && this._sort.key === key) {
          this._sort = { key, dir: this._sort.dir === 1 ? -1 : 1 };
        } else {
          this._sort = { key, dir: 1 };
        }
        return this._render();
      }

      case "comment-submit":
        return this._submitComment();

      case "comment-edit": {
        const cid = trigger.mget("commentId");
        const c = this._comments.find((x) => x.id === cid);
        this._editingCommentId = cid;
        // Seed the inline editor with the comment's current body + its tags.
        this._commentEditDraft = c
          ? { body: c.body || "", mention_uids: uidsFromText(c.body || "") }
          : null;
        return this._refreshCommentList();
      }

      case "comment-save":
        return this._saveCommentEdit();

      case "comment-cancel":
        this._editingCommentId = null;
        this._commentEditDraft = null;
        return this._refreshCommentList();

      case "comment-delete":
        return this._deleteComment(trigger);

      case "comment-reply":
        this._replyingTo = trigger.mget("commentId");
        this._replyDraft = null;
        this._reactPickerFor = null;
        return this._refreshCommentList();

      case "comment-reply-cancel":
        this._replyingTo = null;
        this._replyDraft = null;
        return this._refreshCommentList();

      case "comment-reply-submit":
        return this._submitReply();

      case "comment-react":
        return this._toggleReaction(trigger);

      case "comment-react-toggle": {
        const cid = trigger.mget("commentId");
        this._reactPickerFor = this._reactPickerFor === cid ? null : cid;
        return this._refreshCommentList();
      }

      case "file-search-input":
        return this._scheduleFileSearch(trigger);

      case "link-search-result":
        return this._linkSearchResult(trigger);

      case "remove-pending-file":
        return this._removePendingFile(trigger);

      case _e.upload:
      case "pick-attachment":
        return this._pickAttachment(trigger);

      case "unlink-attachment":
        return this._unlinkAttachment(trigger);

      case "open-attachment":
        return this._openAttachment(trigger.mget("fileNid"));

      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }

  onPartReady(child, pn) {
    if (pn === "fileselector") {
      child.el.onchange = (e) => this._onAttachmentPicked(e);
      return;
    }
    // Mention editors register as "<scope>-desc-editor" (create / detail /
    // comment / comment-edit / comment-reply). Init each with its scope.
    if (typeof pn === "string" && pn.endsWith("-desc-editor")) {
      this._initDescEditor(child.el, pn.slice(0, -"-desc-editor".length));
      return;
    }
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  // Delegated focusin/focusout on the persistent root: the search input is
  // rebuilt on every _render(), so per-input listeners would race the focus
  // restoration. The 200ms blur deferral lets a click on a result row fire
  // before the dropdown is hidden.
  _installFileSearchFocus() {
    if (this._fileSearchFocusInstalled || !this.el) return;
    this._fileSearchFocusInstalled = true;

    const isSearchInput = (t) =>
      t && t.matches && t.matches('input[name^="file-search-"]');
    const fieldOf = (t) => t.closest(".tasks-panel__file-search-field");

    this.el.addEventListener("focusin", (e) => {
      if (!isSearchInput(e.target)) return;
      const field = fieldOf(e.target);
      if (!field) return;
      if (this._fileSearchBlurTimer) {
        clearTimeout(this._fileSearchBlurTimer);
        this._fileSearchBlurTimer = null;
      }
      field.dataset.searchFocused = "1";
    });

    this.el.addEventListener("focusout", (e) => {
      if (!isSearchInput(e.target)) return;
      const field = fieldOf(e.target);
      if (!field) return;
      if (this._fileSearchBlurTimer) clearTimeout(this._fileSearchBlurTimer);
      this._fileSearchBlurTimer = setTimeout(() => {
        this._fileSearchBlurTimer = null;
        const active =
          typeof document !== "undefined" ? document.activeElement : null;
        if (isSearchInput(active)) return;
        if (field.isConnected) field.dataset.searchFocused = "0";
      }, 200);
    });
  }

  onWsMessage(svc, data, options = {}) {
    // The WS dispatcher passes the service name as the FIRST arg — switch on it
    // directly. Reading it from `options` (usually {}) silently skips every case
    // and kills live task/comment refresh (framework-invariants.md §7).
    switch (svc) {
      case SERVICE.task.create:
      case SERVICE.task.update:
      case SERVICE.task.update_status:
      case SERVICE.task.update_assignee:
      case SERVICE.task.delete:
      case SERVICE.task.link_label:
      case SERVICE.task.unlink_label:
        Promise.all([this._loadTasks(), this._loadActivity()]).then(() =>
          this._render(),
        );
        return;
      case SERVICE.task.link_file:
      case SERVICE.task.unlink_file:
        if (this._detailId) {
          this._refreshAttachments(this._detailId).then(() => this._render());
        } else if (this._view === "summary") {
          // Health view's activity feed surfaces file links even with no detail open.
          this._loadActivity().then(() => this._render());
        }
        return;
      case SERVICE.task.column_create:
      case SERVICE.task.column_update:
      case SERVICE.task.column_delete:
        // A peer changed the board's columns. Deleting a column also moves its
        // tasks back to 'todo' server-side, so refresh both.
        Promise.all([this._loadColumns(), this._loadTasks()]).then(() =>
          this._render(),
        );
        return;
      case SERVICE.task.comment_create:
      case SERVICE.task.comment_update:
      case SERVICE.task.comment_delete:
      case SERVICE.task.comment_react:
        // A peer changed a comment. Surgically refresh the open task's feed so
        // an in-progress composer/edit isn't disturbed.
        if (this._detailId) {
          this._loadComments(this._detailId).then(() => {
            if (this._detailId) this._refreshCommentList();
          });
        }
        // Comments also appear in the Health view's activity feed.
        if (this._view === "summary") {
          this._loadActivity().then(() => this._render());
        }
        return;
      default:
        if (super.onWsMessage) super.onWsMessage(svc, data, options);
    }
  }

  async _loadTasks() {
    try {
      const rows = await this.fetchService({
        service: SERVICE.task.list,
        hub_id: this._hubId,
        nid: this._scopeNid,
        include_unscoped: this._scopeIsRoot,
      });
      this._tasks = (Array.isArray(rows) ? rows : []).map(this._normalizeTask);
    } catch (err) {
      this._tasks = [];
    }
  }

  // Custom Kanban columns for the current folder scope. Best-effort — a
  // failure (e.g. server without the task_column procs yet) just leaves the
  // four built-in columns.
  async _loadColumns() {
    try {
      const rows = await this.fetchService({
        service: SERVICE.task.column_list,
        hub_id: this._hubId,
        nid: this._scopeNid,
      });
      this._customColumns = Array.isArray(rows) ? rows : [];
    } catch (err) {
      this._customColumns = [];
    }
  }

  // Recent activity for the current folder scope (Project Health feed). Mirrors
  // _loadTasks' scoping. Best-effort — a failure just yields an empty feed.
  async _loadActivity() {
    try {
      const rows = await this.fetchService({
        service: SERVICE.task.activity,
        hub_id: this._hubId,
        nid: this._scopeNid,
        include_unscoped: this._scopeIsRoot,
        limit: 30,
      });
      this._activity = Array.isArray(rows) ? rows : [];
    } catch (err) {
      this._activity = [];
    }
  }

  // Only normalize fields actually present on `row` — partial responses
  // (task.update / update_status / update_assignee) omit linked_files;
  // defaulting to [] would blank the cached files when _mergeTask spreads.
  _normalizeTask(row) {
    const result = { ...row };
    const has = (k) => Object.prototype.hasOwnProperty.call(row, k);

    if (has("label_ids")) {
      result.label_ids =
        typeof row.label_ids === "string" && row.label_ids
          ? row.label_ids.split(",").filter(Boolean)
          : Array.isArray(row.label_ids)
            ? row.label_ids
            : [];
    }

    // Multi-assignee: server returns a comma-separated string of uids.
    if (has("assignee_uids")) {
      result.assignee_uids =
        typeof row.assignee_uids === "string" && row.assignee_uids
          ? row.assignee_uids.split(",").filter(Boolean)
          : Array.isArray(row.assignee_uids)
            ? row.assignee_uids
            : [];
    } else if (has("assignee_uid")) {
      // Legacy single-assignee row (e.g. older broadcast payloads).
      result.assignee_uids = row.assignee_uid ? [row.assignee_uid] : [];
    }

    if (has("linked_files")) {
      let files = row.linked_files;
      if (typeof files === "string") {
        try {
          files = JSON.parse(files);
        } catch (_) {
          files = [];
        }
      }
      result.linked_files = Array.isArray(files) ? files : [];
    }

    // Coerce due_date to YYYY-MM-DD so <input type="date"> renders it cleanly.
    if (has("due_date")) {
      let due = row.due_date;
      if (due) {
        if (due instanceof Date) due = due.toISOString().slice(0, 10);
        else if (typeof due === "string" && due.length >= 10)
          due = due.slice(0, 10);
      } else {
        due = null;
      }
      result.due_date = due;
    }

    return result;
  }

  async _loadMembers() {
    try {
      const rows = await this.fetchService({
        service: SERVICE.hub.get_members_by_type,
        hub_id: this._hubId,
        type: "all",
      });
      this._members = Array.isArray(rows) ? rows : [];
    } catch (err) {
      this._members = [];
    }
  }

  async _loadLabels() {
    try {
      const rows = await this.fetchService({
        service: SERVICE.label.list,
        hub_id: this._hubId,
      });
      this._labels = Array.isArray(rows) ? rows : [];
    } catch (err) {
      this._labels = [];
    }
  }

  async _refreshAttachments(taskId) {
    try {
      const files = await this.fetchService({
        service: SERVICE.task.get_linked_files,
        hub_id: this._hubId,
        task_id: taskId,
      });
      const list = Array.isArray(files) ? files : [];
      // Linked files live in this hub (cross-hub files are copied in on attach),
      // so the preview is built from file_nid + this hub — no get_node_attr.
      this._attachments[taskId] = list.map((f) => {
        const { previewUrl, chartId } = this._attachmentPreview(f);
        return { ...f, previewUrl, iconChartId: chartId };
      });
    } catch (err) {
      this._attachments[taskId] = [];
    }
  }

  // Shared preview for dragged + committed files: mirrors media imgCapable()
  // (poster-aware) and builds the grid's thumbnail URL (file/<fmt>/<nid>/<hub>).
  _attachmentPreview(attr) {
    const ext = String(attr.ext || attr.extension || "").toLowerCase();
    const filetype = attr.filetype || attr.category || "";
    const mimetype = attr.mimetype || "";
    const cap = attr.capability || "";
    const nid = attr.nid || attr.file_nid;
    const hub = attr.hub_id || this._hubId;
    let meta = attr.metadata;
    if (typeof meta === "string") {
      try {
        meta = JSON.parse(meta);
      } catch (_) {
        meta = null;
      }
    }

    let imgCapable;
    if (meta && meta.poster) imgCapable = true;
    else if (/^-/.test(cap)) imgCapable = false;
    else if (ext === "svg" || ext === "pdf") imgCapable = true;
    else if (/text/.test(mimetype)) imgCapable = false;
    else if (/shell|script|text/.test(filetype)) imgCapable = false;
    else if (/^r/.test(cap)) imgCapable = true;
    else
      imgCapable =
        /^(png|jpe?g|gif|webp|bmp|avif|heic)$/.test(ext) ||
        filetype === _a.image ||
        filetype === _a.video;

    let previewUrl = null;
    if (imgCapable && nid != null && hub != null) {
      const b = (typeof bootstrap === "function" && bootstrap()) || {};
      const endpoint = b.endpoint || "";
      const fmt =
        filetype === _a.vector || ext === "svg"
          ? "orig"
          : ext === "pdf"
            ? "thumb"
            : "vignette";
      let url = `${endpoint}file/${fmt}/${nid}/${hub}`;
      if (b.keysel && attr.area !== "public") url += `?keysel=${b.keysel}`;
      const changed = Math.abs((Number(attr.mtime) || 0) - (Number(attr.ctime) || 0));
      const kc = attr.md5Hash || changed || 0;
      if (kc) url += (url.indexOf("?") >= 0 ? "&" : "?") + "v=" + kc;
      previewUrl = url;
    }

    let chartId = "attachment";
    try {
      const r = require("media/template/icon-name")({
        filetype,
        ext,
        mimetype,
        area: attr.area,
        dataType: attr.dataType,
      });
      if (r && r.chartId) chartId = r.chartId;
    } catch (_) {}
    return { previewUrl, chartId };
  }

  // Read text-field values straight from the live DOM. The Entry widget only
  // syncs on blur/commit/keyup; <input type="date"> change events are missed.
  _captureCreateDraft() {
    if (!this._createDefaults) return;
    const root = this.el && this.el.querySelector(".tasks-panel__create-modal");
    if (!root) return;
    const draft = this._createDefaults;
    const title = root.querySelector('[name="title"]');
    const due = root.querySelector('input[name="due_date"]');
    if (title) draft.title = title.value || "";
    if (due) draft.due_date = due.value || "";
    // description syncs live from the contenteditable editor (_onDescInput).
  }

  _captureDetailDraft() {
    if (!this._detailDraft) return;
    const root = this.el && this.el.querySelector(".tasks-panel__detail-panel");
    if (!root) return;
    const draft = this._detailDraft;
    const title = root.querySelector('[name="title"]');
    const due = root.querySelector('input[name="due_date"]');
    if (title) draft.title = title.value || "";
    if (due) draft.due_date = due.value || "";
    // description syncs live from the contenteditable editor (_onDescInput).
  }

  // Push every keystroke straight into the active draft. The Entry widget
  // sets _input.value asynchronously (~200ms), so a pre-feed DOM read after
  // a re-render would blank typed text before the value is rebound.
  // For widget-driven inputs (e.g. the datepicker) the firing element is not
  // focused, so fall back to reading name/value from the trigger model.
  _onTaskInputChanged(args, trigger) {
    let value = args && args.value != null ? String(args.value) : null;
    let name = null;
    let scopeEl = null;
    const active =
      typeof document !== "undefined" ? document.activeElement : null;
    if (active && active.getAttribute && this.el && this.el.contains(active)) {
      name = active.getAttribute("name");
      scopeEl = active;
    } else if (trigger && trigger.mget) {
      name = trigger.mget(_a.name) || trigger.mget("name");
      if (value == null) {
        const v = trigger.mget(_a.value);
        value = v != null ? String(v) : "";
      }
      scopeEl = trigger.el;
    }
    if (!name || !scopeEl) return;
    if (value == null) value = "";
    const inCreate = this.el.querySelector(".tasks-panel__create-modal");
    const inDetail = this.el.querySelector(".tasks-panel__detail-panel");
    if (
      this._creating &&
      inCreate &&
      inCreate.contains(scopeEl) &&
      this._createDefaults
    ) {
      this._createDefaults[name] = value;
    } else if (this._detailDraft && inDetail && inDetail.contains(scopeEl)) {
      this._detailDraft[name] = value;
    }
  }

  async _commitTask() {
    this._captureCreateDraft();
    const draft = this._createDefaults || {};
    const title = String(draft.title || "").trim();
    const dueRaw = String(draft.due_date || "").trim();
    // Already in marker form (chips serialize to "[@Name](user:uid)").
    const description = String(draft.description || "").trim();

    if (!title) return this._render();

    this._setSubmitting(".tasks-panel__create-submit", true);

    const labels = Array.isArray(draft.labels) ? draft.labels.slice() : [];
    const pendingFiles = Array.isArray(draft.pending_files)
      ? draft.pending_files.slice()
      : [];

    try {
      const raw = await this.postService({
        service: SERVICE.task.create,
        hub_id: this._hubId,
        nid: this._scopeNid,
        title,
        description: description || null,
        status: draft.status || "todo",
        priority: draft.priority || "medium",
        due_date: dueRaw || null,
        assignee_uids: Array.isArray(draft.assignees) ? draft.assignees : [],
        // Tagged members — server notifies them (excluding self).
        mention_uids: Array.isArray(draft.mention_uids)
          ? draft.mention_uids
          : [],
      });
      const row = Array.isArray(raw) ? raw[0] : raw;
      if (row && row.id) {
        // For each pending entry: search-picked files already have `nid`;
        // newly-picked uploads carry a File object and need to be sent to the
        // folder body now. Either way, the resolved nid is link_file'd to
        // the new task.
        const linkPending = async (pf) => {
          let nid = pf.nid;
          if (!nid && pf.file) {
            try {
              const result = await this._uploadPendingFile(pf);
              nid = result.nid;
            } catch (err) {
              console.error("[tasks_panel] pending file upload failed:", err);
              return;
            }
          }
          if (!nid) return;
          await this.postService({
            service: SERVICE.task.link_file,
            hub_id: this._hubId,
            task_id: row.id,
            file_nid: nid,
          }).catch(() => null);
        };
        await Promise.all([
          ...labels.map((labelId) =>
            this.postService({
              service: SERVICE.task.link_label,
              hub_id: this._hubId,
              task_id: row.id,
              label_id: labelId,
            }).catch(() => null),
          ),
          ...pendingFiles.map(linkPending),
        ]);
      }
      // Tear down the form only after a successful create — failures keep
      // the modal open with the user's input intact.
      this._creating = false;
      this._createDefaults = null;
      this._pickerOpen = null;
      this._resetFileSearch();
      await this._loadTasks();
    } catch (err) {
      console.error("[tasks_panel] task.create failed:", err);
    }
    this._setSubmitting(".tasks-panel__create-submit", false);
    this._render();
  }

  async _removeTask(trigger) {
    const id = trigger.mget("taskId");
    if (!id) return;
    try {
      const resp = await this.postService({
        service: SERVICE.task.delete,
        hub_id: this._hubId,
        id,
      });
      if (!resp || (resp.affected !== 1 && resp.id !== id)) return;
      this._tasks = this._tasks.filter((t) => t.id !== id);
      if (this._detailId === id) {
        this._detailId = null;
        this._detailDraft = null;
      }
    } catch (err) {
      console.error("[tasks_panel] task.delete failed:", err);
    }
    this._render();
  }

  // List-view checkbox — toggle a task between complete and todo. Optimistic:
  // flip locally + re-render, persist via update_status, reconcile/revert on
  // the response. Mirrors the drag-to-column status flow.
  async _toggleComplete(trigger) {
    const id = trigger.mget("taskId");
    const task = this._tasks.find((t) => t.id === id);
    if (!task) return;
    const originalStatus = task.status;
    const next = originalStatus === "complete" ? "todo" : "complete";
    task.status = next;
    this._render();
    try {
      const updated = await this.postService({
        service: SERVICE.task.update_status,
        hub_id: this._hubId,
        id,
        status: next,
      });
      this._mergeTask(Array.isArray(updated) ? updated[0] : updated);
    } catch (err) {
      console.error("[tasks_panel] toggle-complete failed:", err);
      task.status = originalStatus;
      this._render();
    }
  }

  async _commitDetail() {
    if (!this._detailId || !this._detailDraft) return;
    this._captureDetailDraft();
    const id = this._detailId;
    const draft = this._detailDraft;
    const task = this._tasks.find((t) => t.id === id);
    if (!task) return;

    this._setSubmitting(".tasks-panel__detail-submit", true);

    const calls = [];

    // task.update — covers title, description, priority, due_date.
    const upd = {};
    const draftTitle = String(draft.title || "").trim();
    const taskTitle = String(task.title || "").trim();
    if (draftTitle && draftTitle !== taskTitle) upd.title = draftTitle;
    // Both are marker form (the editor serializes chips to markers).
    if ((draft.description || "") !== (task.description || "")) {
      upd.description = draft.description || "";
      // Notify only members tagged in this edit who weren't tagged before.
      const before = Array.isArray(draft._mentioned_before)
        ? draft._mentioned_before
        : [];
      const now = Array.isArray(draft.mention_uids) ? draft.mention_uids : [];
      upd.mention_uids = now.filter((u) => !before.includes(u));
    }
    if ((draft.priority || "medium") !== (task.priority || "medium"))
      upd.priority = draft.priority;
    const draftDue = (draft.due_date || "").trim();
    const taskDue = task.due_date || "";
    const dueChanged = draftDue !== taskDue;
    if (Object.keys(upd).length || dueChanged) {
      // task_update SP overwrites due_date unconditionally — always send
      // the current value or another-field update would null the date.
      upd.due_date = draftDue || null;
      calls.push(
        this.postService({
          service: SERVICE.task.update,
          hub_id: this._hubId,
          id,
          ...upd,
        }).catch((err) =>
          console.error("[tasks_panel] task.update failed:", err),
        ),
      );
    }

    if ((draft.status || "todo") !== (task.status || "todo")) {
      calls.push(
        this.postService({
          service: SERVICE.task.update_status,
          hub_id: this._hubId,
          id,
          status: draft.status,
        }).catch((err) =>
          console.error("[tasks_panel] task.update_status failed:", err),
        ),
      );
    }

    // Multi-assignee: send the full new set only when it differs (order-
    // independent) from the task's current assignees.
    const draftAssignees = Array.isArray(draft.assignees) ? draft.assignees : [];
    const taskAssignees = Array.isArray(task.assignee_uids)
      ? task.assignee_uids
      : task.assignee_uid
        ? [task.assignee_uid]
        : [];
    const sameAssignees =
      draftAssignees.length === taskAssignees.length &&
      [...draftAssignees].sort().join(",") === [...taskAssignees].sort().join(",");
    if (!sameAssignees) {
      calls.push(
        this.postService({
          service: SERVICE.task.update_assignee,
          hub_id: this._hubId,
          id,
          assignee_uids: draftAssignees,
        }).catch((err) =>
          console.error("[tasks_panel] task.update_assignee failed:", err),
        ),
      );
    }

    const original = new Set(task.label_ids || []);
    const next = new Set(draft.labels || []);
    for (const lid of next) {
      if (!original.has(lid)) {
        calls.push(
          this.postService({
            service: SERVICE.task.link_label,
            hub_id: this._hubId,
            task_id: id,
            label_id: lid,
          }).catch(() => null),
        );
      }
    }
    for (const lid of original) {
      if (!next.has(lid)) {
        calls.push(
          this.postService({
            service: SERVICE.task.unlink_label,
            hub_id: this._hubId,
            task_id: id,
            label_id: lid,
          }).catch(() => null),
        );
      }
    }

    // Pending attachments — same flow as _commitTask: search-picked entries
    // already have nid; uploaded entries carry the File and need to land in
    // the folder body first.
    const pendingFiles = Array.isArray(draft.pending_files)
      ? draft.pending_files.slice()
      : [];
    for (const pf of pendingFiles) {
      calls.push(
        (async () => {
          let nid = pf.nid;
          if (!nid && pf.file) {
            try {
              const result = await this._uploadPendingFile(pf);
              nid = result.nid;
            } catch (err) {
              console.error("[tasks_panel] pending file upload failed:", err);
              return;
            }
          }
          if (!nid) return;
          await this.postService({
            service: SERVICE.task.link_file,
            hub_id: this._hubId,
            task_id: id,
            file_nid: nid,
          }).catch(() => null);
        })(),
      );
    }

    if (calls.length) await Promise.all(calls);

    await this._loadTasks();
    this._detailId = null;
    this._detailDraft = null;
    this._pickerOpen = null;
    this._resetFileSearch();
    this._setSubmitting(".tasks-panel__detail-submit", false);
    this._render();
  }

  // Render the detail panel immediately on click; refresh attachments async
  // so the panel doesn't feel laggy waiting on get_linked_files.
  _openDetail(id) {
    if (!id) return;
    const task = this._tasks.find((t) => t.id === id);
    this._detailId = id;
    // Description is stored/edited in marker form (`[@Name](user:uid)`); the
    // editor renders chips from it. Seed mention_uids from the existing markers
    // so the Update diff can tell which mentions are newly added.
    const seededMentions = task ? uidsFromText(task.description || "") : [];
    this._detailDraft = task
      ? {
          title: task.title || "",
          description: task.description || "",
          mention_uids: seededMentions.slice(),
          // Snapshot of who was already tagged, so Update only notifies new tags.
          _mentioned_before: seededMentions,
          due_date: task.due_date || "",
          status: task.status || "todo",
          priority: task.priority || "medium",
          assignees: Array.isArray(task.assignee_uids)
            ? task.assignee_uids.slice()
            : task.assignee_uid
              ? [task.assignee_uid]
              : [],
          labels: Array.isArray(task.label_ids) ? task.label_ids.slice() : [],
          // Files picked but not yet uploaded/linked — _commitDetail processes
          // these (upload missing nids, then link_file) on Update.
          pending_files: [],
        }
      : null;
    // Reset comment state for the newly-opened task.
    this._comments = [];
    this._commentDraft = null;
    this._editingCommentId = null;
    this._commentEditDraft = null;
    this._replyingTo = null;
    this._replyDraft = null;
    this._reactPickerFor = null;
    // Re-fetch folder filenames so collision preview (a → a(1)) reflects
    // the folder's current state.
    this._folderFilenames = null;
    this._render();
    this._refreshAttachments(id).then(() => {
      if (this._detailId !== id) return;
      // Initial fetch came back — refeed just the rows, don't touch the
      // form fields the user may have already started editing.
      this._refreshAttachmentsList();
      this._refreshFileSearchDropdown("detail");
    });
    // Surgically feed the comment list when it arrives — a full _render() here
    // rebuilds the panel and replays its open animation (visible glitch).
    this._loadComments(id).then(() => {
      if (this._detailId === id) this._refreshCommentList();
    });
  }

  // ── Custom Kanban columns ────────────────────────────────────
  async _createColumn() {
    const input =
      this.el && this.el.querySelector('.tasks-panel__col-add input[name="col_name"]');
    const name = input ? String(input.value || "").trim() : "";
    if (!name) return;
    try {
      const row = await this.postService({
        service: SERVICE.task.column_create,
        hub_id: this._hubId,
        nid: this._scopeNid,
        name,
        theme: this._colAddTheme || "default",
      });
      const rec = Array.isArray(row) ? row[0] : row;
      if (rec && rec.id) this._customColumns.push(rec);
    } catch (err) {
      console.error("[tasks_panel] column.create failed:", err);
    }
    this._colAddOpen = false;
    this._colAddTheme = "default";
    this._render();
  }

  async _renameColumn(trigger) {
    const id = trigger.mget("taskColumn") || this._colMenuFor;
    if (!id) return;
    const input =
      this.el &&
      this.el.querySelector('.tasks-panel__col-menu input[name="col_rename"]');
    const name = input ? String(input.value || "").trim() : "";
    if (!name) return;
    try {
      await this.postService({
        service: SERVICE.task.column_update,
        hub_id: this._hubId,
        id,
        name,
      });
      const rec = this._customColumns.find((c) => c.id === id);
      if (rec) rec.name = name;
    } catch (err) {
      console.error("[tasks_panel] column.rename failed:", err);
    }
    this._colMenuFor = null;
    this._render();
  }

  async _themeColumn(trigger) {
    const id = trigger.mget("taskColumn") || this._colMenuFor;
    const theme = trigger.mget("colTheme");
    if (!id || !theme) return;
    try {
      await this.postService({
        service: SERVICE.task.column_update,
        hub_id: this._hubId,
        id,
        theme,
      });
      const rec = this._customColumns.find((c) => c.id === id);
      if (rec) rec.theme = theme;
    } catch (err) {
      console.error("[tasks_panel] column.theme failed:", err);
    }
    this._render();
  }

  async _deleteColumn(trigger) {
    const id = trigger.mget("taskColumn") || this._colMenuFor;
    if (!id) return;
    try {
      const resp = await this.postService({
        service: SERVICE.task.column_delete,
        hub_id: this._hubId,
        id,
      });
      const row = Array.isArray(resp) ? resp[0] : resp;
      this._customColumns = this._customColumns.filter((c) => c.id !== id);
      // The server moves the column's tasks back to 'todo' — refresh when any.
      if (row && Number(row.moved_tasks) > 0) await this._loadTasks();
    } catch (err) {
      console.error("[tasks_panel] column.delete failed:", err);
    }
    this._colMenuFor = null;
    this._render();
  }

  // Gantt "Delete selected" — bulk-delete the checked tasks, then clear the
  // selection. Best-effort per task; one failure doesn't abort the rest.
  async _deleteSelectedTasks() {
    const ids = Array.from(this._ganttSelected || []);
    if (!ids.length) return;
    for (const id of ids) {
      try {
        const resp = await this.postService({
          service: SERVICE.task.delete,
          hub_id: this._hubId,
          id,
        });
        if (resp && (resp.affected === 1 || resp.id === id)) {
          this._tasks = this._tasks.filter((t) => t.id !== id);
        }
      } catch (err) {
        console.error("[tasks_panel] gantt bulk delete failed:", id, err);
      }
    }
    this._ganttSelected = new Set();
    this._render();
  }

  // Step the calendar cursor by ±1 month or ±1 week (per the active mode).
  _calShift(dir) {
    try {
      const base = this._calCursor ? Dayjs(this._calCursor) : Dayjs();
      const unit = this._calMode === "week" ? "week" : "month";
      this._calCursor = base.add(dir, unit).format("YYYY-MM-DD");
    } catch (_) {
      this._calCursor = null;
    }
    this._render();
  }

  async _loadComments(taskId) {
    try {
      const rows = await this.fetchService({
        service: SERVICE.task.comment_list,
        hub_id: this._hubId,
        task_id: taskId,
      });
      // reactions arrives as a JSON array (sometimes a JSON string from the DB).
      this._comments = (Array.isArray(rows) ? rows : []).map((r) => {
        let reactions = r.reactions;
        if (typeof reactions === "string") {
          try {
            reactions = JSON.parse(reactions);
          } catch (_) {
            reactions = [];
          }
        }
        return { ...r, reactions: Array.isArray(reactions) ? reactions : [] };
      });
    } catch (err) {
      // Don't silently blank an already-populated feed on a transient failure —
      // that reads to the user as "others' comments disappeared". Log so the
      // real cause (permission / hub scope / 5xx) is visible.
      console.error("[tasks_panel] comment.list failed:", err);
      if (!Array.isArray(this._comments)) this._comments = [];
    }
  }

  async _submitComment() {
    if (!this._detailId) return;
    const draft = this._commentDraft;
    const body = String((draft && draft.body) || "").trim();
    if (!body) return;
    const taskId = this._detailId;
    try {
      await this.postService({
        service: SERVICE.task.comment_create,
        hub_id: this._hubId,
        task_id: taskId,
        body,
        mention_uids: Array.isArray(draft.mention_uids) ? draft.mention_uids : [],
      });
      this._commentDraft = null;
      await this._loadComments(taskId);
    } catch (err) {
      console.error("[tasks_panel] comment.create failed:", err);
    }
    // Surgically slot in the new comment + clear the composer — no full
    // _render() (which rebuilds the whole panel and feels like a reload).
    if (this._detailId === taskId) {
      this._refreshCommentList();
      const ed = this._descEditorEl("comment");
      if (ed) this._renderEditorContent(ed, "");
    }
  }

  async _saveCommentEdit() {
    const id = this._editingCommentId;
    if (!id) return;
    const draft = this._commentEditDraft;
    const body = String((draft && draft.body) || "").trim();
    if (!body) return; // empty edit is a no-op; use delete to remove
    const taskId = this._detailId;
    try {
      await this.postService({
        service: SERVICE.task.comment_update,
        hub_id: this._hubId,
        id,
        body,
        mention_uids: Array.isArray(draft.mention_uids) ? draft.mention_uids : [],
      });
      this._editingCommentId = null;
      this._commentEditDraft = null;
      await this._loadComments(taskId);
    } catch (err) {
      console.error("[tasks_panel] comment.update failed:", err);
    }
    if (this._detailId === taskId) this._refreshCommentList();
  }

  async _deleteComment(trigger) {
    const id = trigger.mget("commentId");
    if (!id || !this._detailId) return;
    const taskId = this._detailId;
    try {
      await this.postService({
        service: SERVICE.task.comment_delete,
        hub_id: this._hubId,
        id,
        task_id: taskId,
      });
      this._comments = this._comments.filter((c) => c.id !== id);
      if (this._editingCommentId === id) {
        this._editingCommentId = null;
        this._commentEditDraft = null;
      }
    } catch (err) {
      console.error("[tasks_panel] comment.delete failed:", err);
    }
    if (this._detailId === taskId) this._refreshCommentList();
  }

  async _submitReply() {
    const rootId = this._replyingTo;
    if (!rootId || !this._detailId) return;
    const draft = this._replyDraft;
    const body = String((draft && draft.body) || "").trim();
    if (!body) return;
    const taskId = this._detailId;
    try {
      await this.postService({
        service: SERVICE.task.comment_create,
        hub_id: this._hubId,
        task_id: taskId,
        parent_id: rootId,
        body,
        mention_uids: Array.isArray(draft.mention_uids) ? draft.mention_uids : [],
      });
      this._replyingTo = null;
      this._replyDraft = null;
      await this._loadComments(taskId);
    } catch (err) {
      console.error("[tasks_panel] comment reply failed:", err);
    }
    if (this._detailId === taskId) this._refreshCommentList();
  }

  async _toggleReaction(trigger) {
    const commentId = trigger.mget("commentId");
    const emoji = trigger.mget("emoji");
    if (!commentId || !emoji || !this._detailId) return;
    const taskId = this._detailId;
    this._reactPickerFor = null;
    try {
      await this.postService({
        service: SERVICE.task.comment_react,
        hub_id: this._hubId,
        comment_id: commentId,
        task_id: taskId,
        emoji,
      });
      await this._loadComments(taskId);
    } catch (err) {
      console.error("[tasks_panel] comment react failed:", err);
    }
    if (this._detailId === taskId) this._refreshCommentList();
  }

  // Read-only render of each comment body into its <div> (reuses the editor's
  // chip rendering). Bodies are populated post-feed, like the description.
  _renderCommentBodies() {
    if (!this.el) return;
    this.el
      .querySelectorAll(`.${this.fig.family}__comment-body[data-comment-id]`)
      .forEach((el) => {
        const c = this._comments.find(
          (x) => String(x.id) === String(el.dataset.commentId),
        );
        if (c) this._renderEditorContent(el, c.body || "");
      });
  }

  // Surgical comment-feed refresh (no full _render) so a peer's WS comment
  // doesn't disturb an in-progress composer. Mirrors _refreshAttachmentsList.
  _refreshCommentList() {
    this.ensurePart("comment-list")
      .then((p) => {
        if (!p || (p.isDestroyed && p.isDestroyed())) return;
        p.feed(require("./skeleton").buildCommentListContent(this));
        this._renderCommentBodies();
        // onPartReady doesn't reliably re-fire for surgically-fed parts, so wire
        // the active inline editors explicitly (mirrors _prepopulateInputs).
        const root = ".tasks-panel__detail-panel ";
        if (this._editingCommentId) {
          const ed = this.el.querySelector(
            root + ".tasks-panel__comment-edit-input",
          );
          if (ed) this._initDescEditor(ed, "comment-edit");
        }
        if (this._replyingTo) {
          const ed = this.el.querySelector(
            root + ".tasks-panel__comment-reply-input",
          );
          if (ed) this._initDescEditor(ed, "comment-reply");
        }
      })
      .catch(() => {});
  }

  _pickAttachment(trigger) {
    // Scope decides where the uploaded file lands after onUploadResponse:
    //   "create" → stashed onto _createDefaults.pending_files (linked on commit)
    //   "detail" (default) → linked to the open task via SERVICE.task.link_file
    const scope = trigger?.mget?.("searchScope");
    this._pendingUploadScope = scope === "create" ? "create" : "detail";
    // FileSelector hardcodes sys_pn to "fileselector".
    return this.ensurePart("fileselector").then((sel) => {
      // sel.open() rebinds onchange every call (overrides the one set in
      // onPartReady), so use sel.el's input directly to preserve our handler.
      const input = sel.el.querySelector?.("input[type='file']") || sel.el;
      input.click?.();
    });
  }

  async _onAttachmentPicked(e) {
    const files = Array.from(e.target?.files || []);
    if (!files.length) return;
    e.target.value = "";
    const scope = this._pendingUploadScope || "detail";
    this._pendingUploadScope = null;

    // Both create and detail use the same deferred-pending flow: stash the
    // File on the active draft and let _commitTask / _commitDetail do the
    // upload + link_file on submit.
    const draft = scope === "create" ? this._createDefaults : this._detailDraft;
    if (!draft) return;

    await this._stashPendingFiles(draft, files);
    return this._refreshPendingList(scope);
  }

  // True when the drag carries OS files (vs. an internal card-reorder drag).
  _isFileDrag(e) {
    const types = e.dataTransfer && e.dataTransfer.types;
    if (!types) return false;
    return Array.from(types).includes("Files");
  }

  // Which draft a dropped/picked file attaches to; null → no task being edited.
  _activeUploadScope() {
    if (this._creating && this._createDefaults) return "create";
    if (this._detailId && this._detailDraft) return "detail";
    return null;
  }

  async _onFilesDropped(e) {
    const scope = this._activeUploadScope();
    if (!scope) {
      if (typeof Butler !== "undefined" && Butler.say) {
        Butler.say(LOCALE.WRONG_DROP_AREA);
      }
      return;
    }
    const files = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
    if (!files.length) return;
    const draft = scope === "create" ? this._createDefaults : this._detailDraft;
    if (!draft) return;
    await this._stashPendingFiles(draft, files);
    this._refreshPendingList(scope);
  }

  // Queues File objects onto a draft's pending list (picker + drag-drop),
  // resolving name collisions and caching an object URL for image previews.
  async _stashPendingFiles(draft, files) {
    await this._ensureFolderFilenames();
    draft.pending_files = draft.pending_files || [];
    let i = 0;
    for (const file of files) {
      const { filename, extension } = this._resolveAvailableName(file.name);
      const localKey = `local:${Date.now()}:${i++}:${file.name}`;
      const entry = { localKey, file, filename, extension };
      if (this._isImageExt(extension)) {
        try {
          entry.previewUrl = URL.createObjectURL(file);
        } catch (_) {}
      }
      draft.pending_files.push(entry);
    }
  }

  _isImageExt(ext) {
    return /^(png|jpe?g|gif|webp|bmp|svg|avif|heic)$/i.test(ext || "");
  }

  _splitFilename(name) {
    const safe = String(name || "");
    const dot = safe.lastIndexOf(".");
    if (dot <= 0 || dot === safe.length - 1) {
      return { filename: safe, extension: "" };
    }
    return { filename: safe.slice(0, dot), extension: safe.slice(dot + 1) };
  }

  // Fetches the folder body's current filenames into a lowercase Set, used
  // by _resolveAvailableName. Cleared whenever the create modal reopens
  // (see "add-task" handler) so we re-fetch after each session.
  async _ensureFolderFilenames() {
    if (this._folderFilenames) return this._folderFilenames;
    this._folderFilenames = new Set();
    try {
      const rows = await this.fetchService({
        service: SERVICE.media.show_node_by,
        hub_id: this._hubId,
        nid: this._destNid,
        type: "all",
        page: 1,
        order: _K.order.descending,
      });
      const list = Array.isArray(rows) ? rows : (rows && rows.rows) || [];
      for (const r of list) {
        const base = r.filename || r.name || "";
        const ext = r.ext || r.extension || "";
        const full = ext ? `${base}.${ext}` : base;
        if (full) this._folderFilenames.add(full.toLowerCase());
      }
    } catch (err) {
      // Best-effort: empty cache means we only dedupe against pending entries.
    }
    return this._folderFilenames;
  }

  // Returns { filename, extension } for the next available name. "a.png" with
  // an existing "a.png" yields { filename: "a(1)", extension: "png" }.
  _resolveAvailableName(originalName) {
    const { filename: base, extension } = this._splitFilename(originalName);
    const ext = extension ? `.${extension}` : "";

    const taken = new Set();
    const addName = (raw, e) => {
      const dotExt = e ? `.${e}` : "";
      const n = `${raw || ""}${dotExt}`.toLowerCase();
      if (n) taken.add(n);
    };

    // Folder body filenames
    if (this._folderFilenames) {
      for (const n of this._folderFilenames) taken.add(n);
    }
    // Pending entries on whichever draft is active
    for (const f of this._createDefaults?.pending_files || []) {
      addName(f.filename, f.extension);
    }
    for (const f of this._detailDraft?.pending_files || []) {
      addName(f.filename, f.extension);
    }
    // Already-linked attachments on the open detail task
    if (this._detailId) {
      for (const f of this._attachments[this._detailId] || []) {
        addName(f.filename, f.extension || f.ext);
      }
    }

    if (!taken.has(`${base}${ext}`.toLowerCase())) {
      return { filename: base, extension };
    }
    let i = 1;
    while (taken.has(`${base}(${i})${ext}`.toLowerCase())) i++;
    return { filename: `${base}(${i})`, extension };
  }

  // Promise-wrapped uploadFile used by _commitTask. Tags scope so the global
  // onUploadResponse skips this xhr (we resolve via the xhr readystate listener).
  // Accepts the full pending entry so the resolved name (e.g. "a(1).png") is
  // sent as the upload filename instead of the original `file.name`.
  _uploadPendingFile(pf) {
    return new Promise((resolve, reject) => {
      this._pendingUploadScope = "_commit";
      const params = { hub_id: this._hubId, nid: this._destNid };
      const fullName = pf.extension
        ? `${pf.filename}.${pf.extension}`
        : pf.filename;
      if (fullName && fullName !== pf.file?.name) {
        params.filename = encodeURI(fullName);
      }
      let xhr;
      try {
        xhr = this.uploadFile(pf.file, params);
      } catch (e) {
        this._pendingUploadScope = null;
        return reject(e);
      }
      if (!xhr) {
        this._pendingUploadScope = null;
        return reject(new Error("upload failed to start"));
      }
      xhr.addEventListener("readystatechange", () => {
        if (xhr.readyState !== 4) return;
        this._pendingUploadScope = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const { data } = JSON.parse(xhr.responseText);
            const nid = data?.nid || data?.id;
            if (!nid) return reject(new Error("no nid in upload response"));
            resolve({ nid, data });
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error(`upload http ${xhr.status}`));
        }
      });
    });
  }

  async onUploadResponse(data) {
    // _commit scope is resolved directly in _uploadPendingFile via the xhr
    // listener — skip the global handler so we don't double-link.
    if (this._pendingUploadScope === "_commit") return;
    this._pendingUploadScope = null;

    const taskId = this._pendingLinkTaskId;
    if (!taskId) return;
    this._pendingLinkTaskId = null;
    const fileNid = data?.nid || data?.id;
    if (!fileNid) return;

    const links = await this.postService({
      service: SERVICE.task.link_file,
      hub_id: this._hubId,
      task_id: taskId,
      file_nid: fileNid,
    });
    this._attachments[taskId] = Array.isArray(links) ? links : [];
    this._render();
  }

  // Find an attachment record by nid across committed + both pending drafts
  // (to read its origin hub_id — a dragged file may live in another hub).
  _findAttachmentRecord(fileNid) {
    const lists = [
      this._attachments[this._detailId],
      this._detailDraft && this._detailDraft.pending_files,
      this._createDefaults && this._createDefaults.pending_files,
    ];
    for (const l of lists) {
      if (!Array.isArray(l)) continue;
      const r = l.find((a) => (a.file_nid || a.nid) === fileNid);
      if (r) return r;
    }
    return null;
  }

  // Open an attachment in its player — mirrors the desk WM's open-by-nid path:
  // node_info → media widget from a Backbone.Model → append the app to the WM
  // pool. (Don't call media.initData() — that throws on an unrendered widget.)
  async _openAttachment(fileNid) {
    if (!fileNid || typeof Wm === "undefined") return;
    const rec = this._findAttachmentRecord(fileNid);
    const hub = (rec && rec.hub_id) || this._hubId;
    let r;
    try {
      r = await this.fetchService(
        { service: SERVICE.media.node_info, nid: fileNid, hub_id: hub },
        { async: 1 },
      );
    } catch (_) {}
    if ((!r || !r.filetype) && rec) {
      r = {
        nid: rec.file_nid || rec.nid,
        hub_id: hub,
        filename: rec.filename,
        filetype: rec.filetype || rec.category,
        ext: rec.extension || rec.ext,
      };
    }
    if (!r || !r.filetype) return;
    try {
      const application = require("builtins/window/configs/application");
      const m = new Backbone.Model(r);
      const fType = r.filetype;
      const k = await Kind.waitFor(_a.media);
      const media = new k({ model: m });
      const preset = {
        nid: r.nid || fileNid,
        hub_id: r.hub_id || hub,
        filename: r.filename,
        filetype: fType,
        vhost: r.vhost,
        home_id: r.home_id,
        holder_id: r.holder_id,
        area: r.area,
        privilege: r.privilege,
        useKeyEvent: 1,
        service: "open-node",
        state: _a.on,
        uiHandler: [this],
        media,
        trigger: media,
        radio: _a.on,
      };
      let app = application(fType, preset);
      if (_.isEmpty(app) || !app.kind) app = { ...app, kind: "props_viewer", media };
      app.style = Wm.getWindowPosition(media);
      await Kind.waitFor(app.kind);
      Wm.getWindowsPool().append(app);
    } catch (e) {
      this.warn && this.warn("open attachment failed", e);
    }
  }

  // No-ops: a media node opened from here may resolve us as its parent.
  syncBounds() {}
  syncOrder() {}

  async _unlinkAttachment(trigger) {
    const taskId = trigger.mget("taskId");
    const fileNid = trigger.mget("fileNid");
    if (!taskId || !fileNid) return;
    await this.postService({
      service: SERVICE.task.unlink_file,
      hub_id: this._hubId,
      task_id: taskId,
      file_nid: fileNid,
    });
    this._attachments[taskId] = (this._attachments[taskId] || []).filter(
      (f) => f.file_nid !== fileNid,
    );
    // Surgical update — full _render() would blow away any unsaved
    // title/description/etc. the user is currently editing.
    this._refreshAttachmentsList();
    // Search dropdown's "Linked" badges depend on the attachments set.
    this._refreshFileSearchDropdown("detail");
  }

  // Marks the submit button as loading and blocks re-entry in onUiEvent.
  // Surgical DOM tweak — avoids a re-render that would steal input focus.
  _setSubmitting(selector, loading) {
    this._submitting = !!loading;
    const btn = this.el?.querySelector(selector);
    if (!btn) return;
    if (loading) {
      btn.dataset.loading = "1";
      btn.dataset.label = btn.textContent || "";
      btn.textContent = LOCALE.LOADING || "Loading…";
    } else {
      btn.dataset.loading = "0";
      if (btn.dataset.label) btn.textContent = btn.dataset.label;
    }
  }

  // Re-feeds just the attachment-rows part of the detail panel.
  _refreshAttachmentsList() {
    const taskId = this._detailId;
    if (!taskId) return;
    const attachments = this._attachments[taskId] || [];
    this.ensurePart("attachment-rows")
      .then((rows) => {
        if (!rows || rows.isDestroyed?.()) return;
        const skel = require("./skeleton");
        rows.feed(skel.buildAttachmentRowsContent(this, attachments, taskId));
        if (rows.el) rows.el.dataset.empty = attachments.length ? "0" : "1";
      })
      .catch(() => {
        /* part not mounted yet */
      });
  }

  // ── File picker (search-and-link) ─────────────────────────────
  _resetFileSearch() {
    if (this._fileSearchTimer) {
      clearTimeout(this._fileSearchTimer);
      this._fileSearchTimer = null;
    }
    if (this._fileSearchBlurTimer) {
      clearTimeout(this._fileSearchBlurTimer);
      this._fileSearchBlurTimer = null;
    }
    this._fileSearch = { query: "", results: [], scope: null };
  }

  _scheduleFileSearch(trigger) {
    const inputEl = trigger?.el?.querySelector("input");
    const query = String(inputEl?.value || "").trim();
    const scope =
      trigger.mget("searchScope") || (this._creating ? "create" : "detail");
    this._fileSearch.query = query;
    this._fileSearch.scope = scope;

    if (this._fileSearchTimer) clearTimeout(this._fileSearchTimer);
    if (query.length < 2) {
      const hadResults = (this._fileSearch.results || []).length > 0;
      this._fileSearch.results = [];
      if (hadResults) this._refreshFileSearchDropdown(scope);
      return;
    }
    this._fileSearchTimer = setTimeout(() => {
      this._runFileSearch(query, scope);
    }, 250);
  }

  async _runFileSearch(query, scope) {
    if (this._fileSearch.query !== query) return;
    const taskId = scope === "detail" ? this._detailId : null;
    try {
      const rows = await this.fetchService({
        service: SERVICE.task.search_files,
        hub_id: this._hubId,
        pattern: query,
        task_id: taskId || undefined,
      });
      if (this._fileSearch.query !== query) return;
      this._fileSearch.results = Array.isArray(rows) ? rows : [];
    } catch (err) {
      this._fileSearch.results = [];
    }
    this._refreshFileSearchDropdown(scope);
  }

  // Surgical update of the file-pending-list part — avoids a full _render()
  // that would steal focus from the title/description inputs.
  _refreshPendingList(scope = "create") {
    const draft = scope === "create" ? this._createDefaults : this._detailDraft;
    const pendingFiles = (draft && draft.pending_files) || [];
    const partName = `file-pending-list-${scope}`;
    this.ensurePart(partName)
      .then((list) => {
        if (!list || list.isDestroyed?.()) return;
        const skel = require("./skeleton");
        list.feed(skel.buildPendingListContent(this, pendingFiles));
        if (list.el) list.el.dataset.empty = pendingFiles.length ? "0" : "1";
      })
      .catch(() => {
        /* part not mounted yet */
      });
  }

  _refreshFileSearchDropdown(scope) {
    if (!scope) return;
    const partName = `file-search-dropdown-${scope}`;
    this.ensurePart(partName)
      .then((dropdown) => {
        if (!dropdown || dropdown.isDestroyed?.()) return;
        const ctx =
          scope === "create"
            ? {
                pendingFiles:
                  (this._createDefaults &&
                    this._createDefaults.pending_files) ||
                  [],
              }
            : {
                existingFiles:
                  (this._detailId && this._attachments[this._detailId]) || [],
                // Detail also has a pending list now — mark those linked too.
                pendingFiles:
                  (this._detailDraft && this._detailDraft.pending_files) || [],
              };
        const skel = require("./skeleton");
        const content = skel.buildFileSearchDropdownContent(this, scope, ctx);
        dropdown.feed(content);
        if (dropdown.el) dropdown.el.dataset.empty = content.length ? "0" : "1";
      })
      .catch(() => {
        /* part not mounted yet */
      });
  }

  async _linkSearchResult(trigger) {
    const nid = trigger.mget("fileNid");
    const filename = trigger.mget("fileName");
    const ext = trigger.mget("fileExt");
    const scope = trigger.mget("searchScope");
    if (!nid) return;

    // Both create and detail stash the pick on the active draft — the actual
    // link_file fires from _commitTask / _commitDetail on submit.
    const draft = scope === "create" ? this._createDefaults : this._detailDraft;
    if (!draft) return;

    const set = new Map(
      (draft.pending_files || []).map((f) => [f.nid || f.localKey, f]),
    );
    if (!set.has(nid)) {
      set.set(nid, { nid, filename, extension: ext });
      draft.pending_files = Array.from(set.values());
    }
    // Close the suggestion dropdown after a pick. We no longer full-render,
    // so clear the search input value in the DOM directly.
    this._resetFileSearch();
    const inputEl = this.el?.querySelector(
      `input[name="file-search-${scope}"]`,
    );
    if (inputEl) inputEl.value = "";
    this._refreshPendingList(scope);
    this._refreshFileSearchDropdown(scope);
  }

  // True when a dragged workspace node can be attached now (a form is open).
  canAttachExisting() {
    return !!this._activeUploadScope();
  }

  // Attach dragged workspace node(s) to the open draft. Same-hub files link by
  // nid; cross-hub files are copied in. Returns true if any node was queued.
  attachExistingNodes(files) {
    const scope = this._activeUploadScope();
    if (!scope) return false;
    const draft = scope === "create" ? this._createDefaults : this._detailDraft;
    if (!draft) return false;

    const list = Array.isArray(files) ? files : [files];
    draft.pending_files = draft.pending_files || [];
    const seen = new Set(
      draft.pending_files.map((f) => f.nid || f.localKey),
    );
    // A drop fires through both the droppable and the folder insertMedia, so
    // this runs twice; the per-nid timestamp stops cross-hub double-copies.
    this._attachingNids = this._attachingNids || new Map();
    const nowTs = Date.now();
    let added = 0;
    const crossHub = [];
    for (const item of list) {
      const isWidget = item && typeof item.mget === "function";
      const attr = isWidget ? item.model.toJSON() : item || {};
      const nid = attr.nid || attr.file_nid || attr.id;
      if (!nid || seen.has(nid)) continue;
      if (nowTs - (this._attachingNids.get(nid) || 0) < 4000) continue;
      this._attachingNids.set(nid, nowTs);
      if (attr.filetype === _a.hub || attr.filetype === _a.folder) continue;
      seen.add(nid);

      // A foreign-hub file can't be linked by nid (this hub 403s on it) — copy
      // it in via the upload pipeline so it becomes a local attachment.
      const srcHub = attr.hub_id;
      if (srcHub && srcHub !== this._hubId) {
        crossHub.push(attr);
        added++;
        continue;
      }

      const { previewUrl, chartId } = this._attachmentPreview(attr);
      draft.pending_files.push({
        nid,
        hub_id: srcHub || this._hubId,
        filename: attr.filename || attr.user_filename || "",
        extension: attr.extension || attr.ext || "",
        filetype: attr.filetype || attr.category,
        previewUrl,
        iconChartId: chartId,
      });
      added++;
    }
    if (crossHub.length) this._queueCrossHubFiles(crossHub, scope);
    if (!added) return false;
    this._refreshPendingList(scope);
    this._refreshFileSearchDropdown(scope);
    return true;
  }

  // Download each foreign-hub file and queue it as an upload into this hub.
  async _queueCrossHubFiles(attrs, scope) {
    const draft = scope === "create" ? this._createDefaults : this._detailDraft;
    if (!draft) return;
    const b = (typeof bootstrap === "function" && bootstrap()) || {};
    const endpoint = b.endpoint || "";
    for (const attr of attrs) {
      try {
        const ext = String(attr.ext || attr.extension || "");
        let url = `${endpoint}file/orig/${attr.nid}/${attr.hub_id}`;
        if (b.keysel) url += `?keysel=${b.keysel}`;
        const resp = await fetch(url, { credentials: "include" });
        if (!resp.ok) {
          this.warn && this.warn(`cross-hub fetch failed ${resp.status}`, url);
          continue;
        }
        const blob = await resp.blob();
        const name = `${attr.filename || attr.user_filename || "file"}${ext ? "." + ext : ""}`;
        const file = new File([blob], name, {
          type: blob.type || attr.mimetype || "",
        });
        await this._stashPendingFiles(draft, [file]);
      } catch (e) {
        this.warn && this.warn("cross-hub attach failed", e);
      }
    }
    this._refreshPendingList(scope);
  }

  _removePendingFile(trigger) {
    const nid = trigger.mget("fileNid");
    const localKey = trigger.mget("localKey");
    const keep = (f) => {
      const drop = localKey ? f.localKey === localKey : nid ? f.nid === nid : false;
      if (drop && f.previewUrl) {
        try {
          URL.revokeObjectURL(f.previewUrl);
        } catch (_) {}
      }
      return !drop;
    };
    // Same row template renders in both scopes; filter both drafts and let
    // the surgical refresh skip whichever isn't mounted.
    if (this._createDefaults?.pending_files) {
      this._createDefaults.pending_files =
        this._createDefaults.pending_files.filter(keep);
    }
    if (this._detailDraft?.pending_files) {
      this._detailDraft.pending_files =
        this._detailDraft.pending_files.filter(keep);
    }
    this._refreshPendingList("create");
    this._refreshPendingList("detail");
    // "Linked" badges in the search dropdown depend on the pending set —
    // refresh both; ensurePart silently no-ops if the part isn't mounted.
    this._refreshFileSearchDropdown("create");
    this._refreshFileSearchDropdown("detail");
  }

  // Colors live in the skin (keyed on data-status/data-priority + data-active);
  // these only flip the active flag so the selected pill restyles in place.
  _updateStatusPills(modalSel, pillSel, newStatus) {
    const root = this.el && this.el.querySelector(modalSel);
    if (!root) return;
    root.querySelectorAll(pillSel).forEach((pill) => {
      pill.dataset.active = pill.dataset.status === newStatus ? "1" : "0";
    });
  }

  _updatePriorityPills(modalSel, newPriority) {
    const root = this.el && this.el.querySelector(modalSel);
    if (!root) return;
    root.querySelectorAll(".tasks-panel__priority-pill").forEach((pill) => {
      pill.dataset.active = pill.dataset.priority === newPriority ? "1" : "0";
    });
  }

  _updateLabelOptions(modalSel, selectedLabelIds) {
    const root = this.el && this.el.querySelector(modalSel);
    if (!root) return;
    const labels = this.getLabels();
    const colorById = {};
    labels.forEach((l) => {
      colorById[l.id] = l.color;
    });
    const selectedSet = new Set((selectedLabelIds || []).map(String));
    root.querySelectorAll(".tasks-panel__label-option").forEach((opt) => {
      const id = opt.dataset.labelId;
      const color = colorById[id] || "";
      const selected = selectedSet.has(String(id));
      opt.dataset.selected = selected ? "1" : "0";
      if (selected) {
        opt.style.background = color;
        opt.style.borderColor = color;
        opt.style.color = "";
      } else {
        opt.style.background = "";
        opt.style.borderColor = color;
        opt.style.color = color;
      }
    });
  }

  // Toggle a uid in/out of an assignee array (multi-select). An empty uid is
  // the "Unassigned" row → clears the whole set.
  _toggleAssignee(current, uid) {
    const list = Array.isArray(current) ? current.slice() : [];
    if (!uid) return [];
    const i = list.indexOf(uid);
    if (i >= 0) list.splice(i, 1);
    else list.push(uid);
    return list;
  }

  // Reflect the current assignee set in the picker rows + button, in place.
  // The picker stays OPEN so the user can pick several members in a row.
  _applyAssigneeChange(kind, assignees) {
    if (!this.el) return;
    const set = new Set((assignees || []).map(String));
    const picker = this._findPickerEl(kind);
    if (picker) {
      picker.querySelectorAll(".tasks-panel__member-row").forEach((row) => {
        const uid = row.getAttribute("data-member-uid") || "";
        // The "Unassigned" row (uid === "") is active only when the set is empty.
        row.dataset.active = uid
          ? set.has(uid)
            ? "1"
            : "0"
          : set.size
            ? "0"
            : "1";
      });
    }
    this.ensurePart(`${kind}-button`)
      .then((btn) => {
        if (!btn || btn.isDestroyed?.()) return;
        btn.feed(
          require("./skeleton").buildAssigneeButtonContent(this, assignees),
        );
      })
      .catch(() => {
        /* not mounted yet */
      });
  }

  _applyPickerOpen(kind, isOpen) {
    if (!this.el || !kind) return;
    this._setPickerOpenInDom(kind, isOpen);
  }

  _setPickerOpenInDom(kind, isOpen) {
    const btn = this.el.querySelector(
      `.tasks-panel__assignee-button[data-picker-kind="${kind}"]`,
    );
    if (btn) btn.dataset.open = isOpen ? "1" : "0";
    const picker = this._findPickerEl(kind);
    if (picker) picker.dataset.open = isOpen ? "1" : "0";
  }

  _findPickerEl(kind) {
    if (!this.el || !kind) return null;
    return this.el.querySelector(
      `.tasks-panel__member-picker[data-picker-kind="${kind}"]`,
    );
  }

  // ── @-mention (contenteditable description editor) ─────────────
  // The description is a contenteditable div, so tagged members render as
  // styled inline chips and the dropdown anchors to the live caret. The chip
  // carries the uid, so serialization to "[@Name](user:uid)" markers is exact
  // (no fragile name-matching) and that marker form is what we store/send.

  // Per-scope adapter: which DOM element the editor binds to and where it
  // reads/writes its marker text. Decouples the mention editor from any one
  // model so the description (create/detail) and the comment composer can all
  // reuse the same editor logic.
  _mentionTarget(scope) {
    const pfx = this.fig.family;
    switch (scope) {
      case "create":
        return {
          editorSelector: `.${pfx}__create-modal .${pfx}__desc-editor`,
          placeholder: LOCALE.TASK_DESCRIPTION_PLACEHOLDER,
          get: () =>
            (this._createDefaults && this._createDefaults.description) || "",
          set: (text, uids) => {
            if (!this._createDefaults) return;
            this._createDefaults.description = text;
            this._createDefaults.mention_uids = uids;
          },
        };
      case "detail":
        return {
          editorSelector: `.${pfx}__detail-panel .${pfx}__desc-editor`,
          placeholder: LOCALE.TASK_DESCRIPTION_PLACEHOLDER,
          get: () => (this._detailDraft && this._detailDraft.description) || "",
          set: (text, uids) => {
            if (!this._detailDraft) return;
            this._detailDraft.description = text;
            this._detailDraft.mention_uids = uids;
          },
        };
      case "comment":
        return {
          editorSelector: `.${pfx}__detail-panel .${pfx}__comment-input`,
          placeholder: LOCALE.TASK_COMMENT_PLACEHOLDER,
          get: () => (this._commentDraft && this._commentDraft.body) || "",
          set: (text, uids) => {
            this._commentDraft = { body: text, mention_uids: uids };
          },
        };
      case "comment-edit":
        return {
          editorSelector: `.${pfx}__detail-panel .${pfx}__comment-edit-input`,
          placeholder: LOCALE.TASK_COMMENT_PLACEHOLDER,
          get: () => (this._commentEditDraft && this._commentEditDraft.body) || "",
          set: (text, uids) => {
            this._commentEditDraft = { body: text, mention_uids: uids };
          },
        };
      case "comment-reply":
        return {
          editorSelector: `.${pfx}__detail-panel .${pfx}__comment-reply-input`,
          placeholder: LOCALE.TASK_COMMENT_PLACEHOLDER,
          get: () => (this._replyDraft && this._replyDraft.body) || "",
          set: (text, uids) => {
            this._replyDraft = { body: text, mention_uids: uids };
          },
        };
      default:
        return null;
    }
  }

  _descEditorEl(scope) {
    const t = this._mentionTarget(scope);
    return t && this.el && this.el.querySelector(t.editorSelector);
  }

  // Build a contenteditable=false chip node for a mention.
  _makeMentionChip(uid, name) {
    const chip = document.createElement("span");
    chip.className = `${this.fig.family}__mention-chip`;
    chip.setAttribute("contenteditable", "false");
    chip.dataset.uid = String(uid);
    chip.dataset.name = name;
    chip.textContent = `@${name}`;
    return chip;
  }

  // Render stored marker text into the editor as text nodes + chip spans.
  _renderEditorContent(editorEl, markerText) {
    editorEl.textContent = "";
    const text = String(markerText || "");
    const appendText = (str) => {
      str.split("\n").forEach((part, i) => {
        if (i > 0) editorEl.appendChild(document.createElement("br"));
        if (part) editorEl.appendChild(document.createTextNode(part));
      });
    };
    const re = markerRe();
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      if (m.index > last) appendText(text.slice(last, m.index));
      editorEl.appendChild(this._makeMentionChip(m[2], m[1]));
      last = re.lastIndex;
    }
    if (last < text.length) appendText(text.slice(last));
  }

  // Editor DOM → marker text. Chips become "[@Name](user:uid)"; <br>/<div>
  // boundaries become newlines.
  _serializeEditor(editorEl) {
    const chipClass = `${this.fig.family}__mention-chip`;
    let out = "";
    const walk = (node) => {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          out += n.textContent;
        } else if (n.nodeType === 1) {
          if (n.classList && n.classList.contains(chipClass)) {
            const uid = n.dataset.uid;
            const name = n.dataset.name || n.textContent.replace(/^@/, "");
            out += `[@${name}](user:${uid})`;
          } else if (n.tagName === "BR") {
            out += "\n";
          } else if (n.tagName === "DIV") {
            if (out && !out.endsWith("\n")) out += "\n";
            walk(n);
          } else {
            walk(n);
          }
        }
      });
    };
    walk(editorEl);
    return out;
  }

  _collectMentionUids(editorEl) {
    const uids = [];
    editorEl
      .querySelectorAll(`.${this.fig.family}__mention-chip`)
      .forEach((c) => {
        const u = String(c.dataset.uid || "");
        if (u && !uids.includes(u)) uids.push(u);
      });
    return uids;
  }

  // Seed the editor from the draft and wire its events. Idempotent and called
  // from both onPartReady and _prepopulateInputs (onPartReady alone doesn't
  // reliably re-fire on reopen); only re-renders when the DOM differs from the
  // draft, so an active caret isn't disturbed.
  _initDescEditor(editorEl, scope) {
    if (!editorEl) return;
    const target = this._mentionTarget(scope);
    if (!target) return;
    // Guarantee the placeholder attr even if the framework dropped attrOpt.
    if (!editorEl.getAttribute("data-placeholder") && target.placeholder) {
      editorEl.setAttribute("data-placeholder", target.placeholder);
    }
    const want = target.get();
    if (this._serializeEditor(editorEl) !== want) {
      this._renderEditorContent(editorEl, want);
    }
    editorEl.oninput = () => this._onDescInput(scope, editorEl);
    editorEl.onkeydown = (e) => this._onDescKeydown(e, scope);
    editorEl.onblur = () => setTimeout(() => this._closeMention(), 150);
  }

  _onDescInput(scope, editorEl) {
    // Browsers leave a stray <br> when the field is cleared, which defeats the
    // :empty placeholder — strip it back to truly empty.
    if (
      !editorEl.textContent.trim() &&
      !editorEl.querySelector(`.${this.fig.family}__mention-chip`)
    ) {
      editorEl.innerHTML = "";
    }
    const target = this._mentionTarget(scope);
    if (target) {
      target.set(
        this._serializeEditor(editorEl),
        this._collectMentionUids(editorEl),
      );
    }
    this._handleEditorMention(editorEl, scope);
  }

  _onDescKeydown(e, scope) {
    const ref = this._mention;
    if (!ref || ref.scope !== scope) return;
    if (e.key === "Escape") {
      e.preventDefault();
      return this._closeMention();
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = ref.members.length;
      ref.index = (ref.index + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
      return this._highlightMention(ref);
    }
    if (e.key === "Enter") {
      e.preventDefault();
      return this._insertMentionChip(scope, ref.members[ref.index]);
    }
  }

  // Detect an unterminated "@token" immediately before a collapsed caret and
  // open the filtered dropdown. "@" alone lists everyone.
  _handleEditorMention(editorEl, scope) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return this._closeMention();
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (!range.collapsed || node.nodeType !== 3 || !editorEl.contains(node))
      return this._closeMention();
    const m = node.textContent.slice(0, range.startOffset).match(/@([^\s@]*)$/);
    if (!m) return this._closeMention();
    const filter = m[1].toLowerCase();
    const members = (this._members || [])
      .filter((mm) => {
        if (!filter) return true;
        const name = [mm.firstname, mm.lastname]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return (
          name.includes(filter) ||
          String(mm.email || "").toLowerCase().includes(filter)
        );
      })
      .slice(0, 8);
    if (!members.length) return this._closeMention();
    this._mention = {
      scope,
      node,
      start: range.startOffset - m[0].length,
      end: range.startOffset,
      members,
      index: 0,
      dropdownEl: null,
    };
    this._openMention(scope, members, editorEl);
  }

  _openMention(scope, members, editorEl) {
    const skel = require("./skeleton");
    this.ensurePart(`${scope}-mention`)
      .then((part) => {
        if (!part || (part.isDestroyed && part.isDestroyed())) return;
        part.feed(skel.buildMentionItemsContent(this, members));
        const root = part.el;
        if (!root || !this._mention || this._mention.scope !== scope) return;
        this._mention.dropdownEl = root;
        root
          .querySelectorAll(`.${this.fig.family}__mention-item`)
          .forEach((el, i) => {
            el.dataset.active = i === 0 ? "1" : "0";
            // Keep caret/selection in the editor through the click.
            el.onmousedown = (ev) => ev.preventDefault();
            el.onclick = (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              this._insertMentionChip(scope, members[i]);
            };
          });
        this._positionMentionAtCaret(root, editorEl);
        root.dataset.open = "1";
      })
      .catch(() => {
        /* not mounted yet */
      });
  }

  // Position the popup just under the "@" text, anchored relative to the
  // __desc-field (absolute, not fixed): windows are placed via CSS transform,
  // so fixed coords would resolve against the window box and land outside. The
  // caret rect comes from the @token range (a collapsed-caret rect is often
  // empty); coordinates are field-relative, so transforms cancel out.
  _positionMentionAtCaret(el, editorEl) {
    // The editor's wrapper is the positioning context (position: relative); the
    // dropdown is its sibling. Using the parent (not a fixed class) keeps this
    // generic across the description field and the comment composer.
    const field = editorEl.parentNode;
    if (!field) return;
    const ref = this._mention;
    let caret = null;
    if (ref && ref.node && ref.node.isConnected) {
      try {
        const r = document.createRange();
        r.setStart(ref.node, Math.max(0, ref.start));
        r.setEnd(ref.node, Math.min(ref.end, ref.node.length));
        caret = r.getBoundingClientRect();
      } catch (_) {
        /* offsets shifted — fall through */
      }
    }
    if (!caret || (!caret.width && !caret.height)) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) caret = sel.getRangeAt(0).getBoundingClientRect();
    }
    if (!caret || (!caret.width && !caret.height && !caret.left && !caret.top)) {
      caret = editorEl.getBoundingClientRect();
    }
    const fieldRect = field.getBoundingClientRect();
    const maxH = 220;
    el.style.left = `${Math.round(caret.left - fieldRect.left)}px`;
    // Flip above the caret line when there isn't room below in the viewport.
    if (window.innerHeight - caret.bottom < maxH) {
      el.style.top = "auto";
      el.style.bottom = `${Math.round(fieldRect.bottom - caret.top + 4)}px`;
    } else {
      el.style.bottom = "auto";
      el.style.top = `${Math.round(caret.bottom - fieldRect.top + 4)}px`;
    }
  }

  _highlightMention(ref) {
    if (!ref || !ref.dropdownEl) return;
    ref.dropdownEl
      .querySelectorAll(`.${this.fig.family}__mention-item`)
      .forEach((el, i) => {
        el.dataset.active = i === ref.index ? "1" : "0";
      });
  }

  _closeMention() {
    if (!this._mention) return;
    this._mention = null;
    if (!this.el) return;
    this.el
      .querySelectorAll(`.${this.fig.family}__mention-dropdown`)
      .forEach((d) => {
        d.dataset.open = "0";
      });
  }

  // Replace the "@token" range in the caret's text node with a chip + space.
  _insertMentionChip(scope, member) {
    const ref = this._mention;
    this._closeMention();
    if (!ref || !member) return;
    const node = ref.node;
    if (!node || node.nodeType !== 3 || !node.isConnected) return;
    const editorEl = this._descEditorEl(scope);
    if (!editorEl) return;
    const uid = String(member.id || member.uid || "");
    const name =
      [member.firstname, member.lastname].filter(Boolean).join(" ").trim() ||
      member.email ||
      uid;
    if (!uid) return;

    const full = node.textContent;
    const parent = node.parentNode;
    const chip = this._makeMentionChip(uid, name);
    const space = document.createTextNode(" ");
    const afterNode = document.createTextNode(full.slice(ref.end));
    node.textContent = full.slice(0, ref.start);
    parent.insertBefore(afterNode, node.nextSibling);
    parent.insertBefore(space, afterNode);
    parent.insertBefore(chip, space);

    const range = document.createRange();
    range.setStart(afterNode, 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    editorEl.focus();

    const target = this._mentionTarget(scope);
    if (target) {
      target.set(
        this._serializeEditor(editorEl),
        this._collectMentionUids(editorEl),
      );
    }
  }

  _prepopulateInputs() {
    if (!this.el) return;
    const setVal = (sel, val) => {
      const el = this.el.querySelector(sel);
      if (el && (val || "") !== el.value) el.value = val || "";
    };
    // The description editor is contenteditable; populate it here too (not just
    // in onPartReady, which doesn't reliably re-fire on reopen).
    const initEditor = (sel, scope) => {
      const ed = this.el.querySelector(sel);
      if (ed) this._initDescEditor(ed, scope);
    };
    if (this._creating && this._createDefaults) {
      setVal(
        '.tasks-panel__create-modal [name="title"]',
        this._createDefaults.title,
      );
      initEditor(
        ".tasks-panel__create-modal .tasks-panel__desc-editor",
        "create",
      );
    }
    if (this._detailDraft) {
      setVal(
        '.tasks-panel__detail-panel [name="title"]',
        this._detailDraft.title,
      );
      initEditor(
        ".tasks-panel__detail-panel .tasks-panel__desc-editor",
        "detail",
      );
      initEditor(
        ".tasks-panel__detail-panel .tasks-panel__comment-input",
        "comment",
      );
      if (this._editingCommentId) {
        initEditor(
          ".tasks-panel__detail-panel .tasks-panel__comment-edit-input",
          "comment-edit",
        );
      }
      if (this._replyingTo) {
        initEditor(
          ".tasks-panel__detail-panel .tasks-panel__comment-reply-input",
          "comment-reply",
        );
      }
    }
  }

  _mergeTask(row) {
    if (!row || !row.id) return;
    const normalized = this._normalizeTask(row);
    const idx = this._tasks.findIndex((t) => t.id === row.id);
    if (idx === -1) this._tasks.push(normalized);
    else this._tasks[idx] = { ...this._tasks[idx], ...normalized };
  }

  _render() {
    // Drafts stay in sync via the `task-input-changed` watch — do NOT add
    // a pre-feed DOM read here; it would race the Entry's async setter.

    // Capture focused input + cursor BEFORE the DOM swap, restore after.
    let focusName = null;
    let cursorPos = null;
    let cursorEnd = null;
    let scopeSel = "";
    const active =
      typeof document !== "undefined" ? document.activeElement : null;
    if (active && this.el && this.el.contains(active) && active.getAttribute) {
      focusName = active.getAttribute("name");
      const inCreate = this.el.querySelector(".tasks-panel__create-modal");
      const inDetail = this.el.querySelector(".tasks-panel__detail-panel");
      if (inCreate && inCreate.contains(active))
        scopeSel = ".tasks-panel__create-modal ";
      else if (inDetail && inDetail.contains(active))
        scopeSel = ".tasks-panel__detail-panel ";
      try {
        cursorPos = active.selectionStart;
        cursorEnd = active.selectionEnd;
      } catch (_) {
        /* date / number inputs throw here */
      }
    }

    this.feed(require("./skeleton")(this));
    // ui-core sets <input> values through a 200ms `waitElement` poll, so
    // the title/description start empty after each feed; pre-populate them
    // (sync + next frame as a safety net for late-mount children).
    this._prepopulateInputs();
    this._renderCommentBodies();
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        this._prepopulateInputs();
        this._renderCommentBodies();
      });
    }

    if (focusName && typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        if (!this.el) return;
        const next = this.el.querySelector(`${scopeSel}[name="${focusName}"]`);
        if (!next || typeof next.focus !== "function") return;
        next.focus();
        if (cursorPos != null && typeof next.setSelectionRange === "function") {
          try {
            next.setSelectionRange(
              cursorPos,
              cursorEnd != null ? cursorEnd : cursorPos,
            );
          } catch (_) {}
        }
      });
    }
  }

  // ── Skeleton accessors ─────────────────────────────────────────
  // Board columns = the four built-ins followed by this folder's custom
  // columns. Every entry is render-ready: `name` is the display string
  // (LOCALE for built-ins, user text for customs), `color` the accent hex,
  // `theme` the palette key driving pill tints, `custom` marks editability.
  getColumns() {
    const builtins = COLUMNS.map((c) => ({
      ...c,
      name: LOCALE[c.label] || c.key,
    }));
    const customs = (this._customColumns || []).map((r) => ({
      key: r.id,
      label: "",
      name: r.name || "",
      theme: COLUMN_THEMES[r.theme] ? r.theme : "default",
      color: COLUMN_THEMES[r.theme] || COLUMN_THEMES.default,
      custom: 1,
    }));
    return builtins.concat(customs);
  }
  getColumnThemes() {
    return COLUMN_THEMES;
  }
  getColAddState() {
    return { open: this._colAddOpen, theme: this._colAddTheme };
  }
  getColMenuFor() {
    return this._colMenuFor;
  }
  getPriorities() {
    return PRIORITIES;
  }
  getMembers() {
    return this._members;
  }
  getLabels() {
    return this._labels;
  }
  getLabel(id) {
    return this._labels.find((l) => l.id === id) || null;
  }
  getMember(uid) {
    return this._members.find((m) => m.id === uid || m.uid === uid) || null;
  }

  getFilterUids() {
    return this._filterUids;
  }

  // Member-filter predicate shared by every view (board / list / summary).
  _matchesFilter(t) {
    const filter = this._filterUids || [];
    if (!filter.length) return true;
    const uids = Array.isArray(t.assignee_uids)
      ? t.assignee_uids.map(String)
      : t.assignee_uid
        ? [String(t.assignee_uid)]
        : [];
    return uids.some((u) => filter.includes(u));
  }

  getState() {
    return this.getColumns().reduce((acc, c) => {
      acc[c.key] = this._tasks.filter(
        (t) => t.status === c.key && this._matchesFilter(t),
      );
      return acc;
    }, {});
  }

  // Flat member-filtered task list — the dataset for the List + Summary views.
  getFilteredTasks() {
    return this._tasks.filter((t) => this._matchesFilter(t));
  }

  // Recent activity rows for the Project Health view (already folder-scoped by
  // the server). When a member filter is active, restrict to tasks owned by the
  // filtered members so the feed agrees with the rest of the view.
  getActivity() {
    const rows = Array.isArray(this._activity) ? this._activity : [];
    const filter = this._filterUids || [];
    if (!filter.length) return rows;
    const allowed = new Set(this.getFilteredTasks().map((t) => t.id));
    return rows.filter((r) => allowed.has(r.task_id));
  }

  getView() {
    return this._view || "board";
  }
  getSort() {
    return this._sort || null;
  }
  getCalMode() {
    return this._calMode || "month";
  }
  getCalCursor() {
    return this._calCursor;
  }
  getGanttMode() {
    return this._ganttMode || "weeks";
  }
  getGanttSelected() {
    return this._ganttSelected;
  }

  isCreating() {
    return this._creating;
  }
  getCreateDraft() {
    return this._createDefaults || null;
  }
  getPickerOpen() {
    return this._pickerOpen;
  }
  getFileSearch() {
    return this._fileSearch;
  }

  getDetailTask() {
    if (!this._detailId) return null;
    return this._tasks.find((t) => t.id === this._detailId) || null;
  }
  getDetailDraft() {
    return this._detailDraft;
  }
  getDetailAttachments() {
    return (this._detailId && this._attachments[this._detailId]) || [];
  }
  getComments() {
    return this._comments;
  }
  getEditingCommentId() {
    return this._editingCommentId;
  }
  getReplyingTo() {
    return this._replyingTo;
  }
  getReactPickerFor() {
    return this._reactPickerFor;
  }
}

module.exports = __tasks_panel;
