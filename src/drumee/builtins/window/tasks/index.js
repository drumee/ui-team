const { uploadFile } = require("@drumee/ui-essentials");

const COLUMNS = [
  { key: "todo",        label: "STATUS_TODO",        color: "#AEAEB2" },
  { key: "in_progress", label: "STATUS_IN_PROGRESS", color: "#65D0EA" },
  { key: "to_review",   label: "STATUS_TO_REVIEW",   color: "#E8A13B" },
  { key: "complete",    label: "STATUS_COMPLETE",    color: "#54B684" },
];

const PRIORITIES = [
  { key: "low",    label: "PRIORITY_LOW",    color: "#54B684" },
  { key: "medium", label: "PRIORITY_MEDIUM", color: "#65D0EA" },
  { key: "high",   label: "PRIORITY_HIGH",   color: "#E8A13B" },
  { key: "urgent", label: "PRIORITY_URGENT", color: "#d65f59" },
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
    this._tasks = [];
    this._members = [];
    this._labels = [];
    this._creating = false;
    this._createDefaults = null;
    this._detailId = null;
    this._detailDraft = null;
    this._attachments = {};
    this._pickerOpen = null;
    this._fileSearch = { query: "", results: [], scope: null };
    this._fileSearchTimer = null;
    this._fileSearchBlurTimer = null;
    this.bindEvent(_a.live);
  }

  onBeforeDestroy() {
    this.unbindEvent(_a.live);
    if (this._fileSearchTimer) clearTimeout(this._fileSearchTimer);
    if (this._fileSearchBlurTimer) clearTimeout(this._fileSearchBlurTimer);
  }

  async onDomRefresh() {
    this._installDnd();
    this._installFileSearchFocus();
    await Promise.all([
      this._loadTasks(),
      this._loadMembers(),
      this._loadLabels(),
    ]);
    this._render();
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
      } catch (_) { /* ignore */ }
    });

    root.addEventListener("dragend", (e) => {
      const card = findCard(e.target);
      if (card) card.classList.remove("is-dragging");
      this._dragTaskId = null;
      root.querySelectorAll(".tasks-panel__column-body.is-drop-target")
          .forEach((n) => n.classList.remove("is-drop-target"));
    });

    root.addEventListener("dragover", (e) => {
      const col = findColumn(e.target);
      if (!col) return;
      e.preventDefault();
      try { e.dataTransfer.dropEffect = "move"; } catch (_) {}
      root.querySelectorAll(".tasks-panel__column-body.is-drop-target")
          .forEach((n) => { if (n !== col) n.classList.remove("is-drop-target"); });
      col.classList.add("is-drop-target");
    });

    root.addEventListener("dragleave", (e) => {
      const col = findColumn(e.target);
      if (col) col.classList.remove("is-drop-target");
    });

    root.addEventListener("drop", (e) => {
      const col = findColumn(e.target);
      if (!col) return;
      e.preventDefault();
      const transferId = (() => {
        try { return e.dataTransfer.getData("text/plain"); } catch (_) { return null; }
      })();
      const taskId = this._dragTaskId || transferId;
      const targetStatus = col.dataset.dropcol;
      this._dragTaskId = null;
      root.querySelectorAll(".tasks-panel__column-body.is-drop-target")
          .forEach((n) => n.classList.remove("is-drop-target"));
      if (!taskId || !targetStatus) return;
      this._moveTaskTo(taskId, targetStatus);
    });
  }

  async _moveTaskTo(taskId, status) {
    const task = this._tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;
    const originalStatus = task.status;
    task.status = status;
    this._render();
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
    }
    this._render();
  }

  async onUiEvent(trigger, args = {}) {
    let service = args.service || (trigger && trigger.get && trigger.get(_a.service));
    // Drumee dispatches click on the deepest widget; if it has no service of
    // its own (e.g. a Note inside a card), walk up to find an ancestor that does.
    if (!service && trigger && trigger.parent) {
      let p = trigger.parent;
      let depth = 0;
      while (p && depth < 8) {
        const s = p.mget && p.mget(_a.service);
        if (s) { service = s; trigger = p; break; }
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
          assignee_uid: null,
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
          this._updateStatusPills(".tasks-panel__create-modal",
                                  ".tasks-panel__create-status-pill", next);
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
          const uid = trigger.mget("memberUid") || null;
          this._createDefaults.assignee_uid = uid;
          this._pickerOpen = null;
          this._applyAssigneeChange("create-assignee", uid);
        }
        return;

      case "create-toggle-label":
        if (this._createDefaults) {
          const id = trigger.mget("labelId");
          const set = new Set(this._createDefaults.labels);
          if (set.has(id)) set.delete(id); else set.add(id);
          this._createDefaults.labels = Array.from(set);
          this._updateLabelOptions(".tasks-panel__create-modal",
                                   this._createDefaults.labels);
        }
        return;

      case "toggle-picker": {
        const kind = trigger.mget("pickerKind");
        this._pickerOpen = this._pickerOpen === kind ? null : kind;
        this._applyPickerOpen(kind, this._pickerOpen === kind);
        return;
      }

      case "remove-task":
        return this._removeTask(trigger);

      case "commit-description":
      case "commit-due-date":
        // Drafts stay in sync via the `task-input-changed` watch.
        return;

      case "set-status":
        if (this._detailDraft) {
          const next = trigger.mget("taskStatus");
          this._detailDraft.status = next;
          this._updateStatusPills(".tasks-panel__detail-panel",
                                  ".tasks-panel__detail-status-pill", next);
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
          const uid = trigger.mget("memberUid") || null;
          this._detailDraft.assignee_uid = uid;
          this._pickerOpen = null;
          this._applyAssigneeChange("detail-assignee", uid);
        }
        return;

      case "toggle-task-label":
        if (this._detailDraft) {
          const id = trigger.mget("labelId");
          const set = new Set(this._detailDraft.labels || []);
          if (set.has(id)) set.delete(id); else set.add(id);
          this._detailDraft.labels = Array.from(set);
          this._updateLabelOptions(".tasks-panel__detail-panel",
                                   this._detailDraft.labels);
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
        this._resetFileSearch();
        return this._render();

      case "open-detail":
        return this._openDetail(trigger.mget("taskId"));

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

      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }

  onPartReady(child, pn) {
    if (pn === "fileselector") {
      child.el.onchange = (e) => this._onAttachmentPicked(e);
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
        const active = (typeof document !== "undefined") ? document.activeElement : null;
        if (isSearchInput(active)) return;
        if (field.isConnected) field.dataset.searchFocused = "0";
      }, 200);
    });
  }

  onWsMessage(svc, data, options = {}) {
    const { service } = options || svc;
    switch (service) {
      case SERVICE.task.create:
      case SERVICE.task.update:
      case SERVICE.task.update_status:
      case SERVICE.task.update_assignee:
      case SERVICE.task.delete:
      case SERVICE.task.link_label:
      case SERVICE.task.unlink_label:
        this._loadTasks().then(() => this._render());
        return;
      case SERVICE.task.link_file:
      case SERVICE.task.unlink_file:
        if (this._detailId) {
          this._refreshAttachments(this._detailId).then(() => this._render());
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
      });
      this._tasks = (Array.isArray(rows) ? rows : []).map(this._normalizeTask);
    } catch (err) {
      this._tasks = [];
    }
  }

  // Only normalize fields actually present on `row` — partial responses
  // (task.update / update_status / update_assignee) omit linked_files;
  // defaulting to [] would blank the cached files when _mergeTask spreads.
  _normalizeTask(row) {
    const result = { ...row };
    const has = (k) => Object.prototype.hasOwnProperty.call(row, k);

    if (has("label_ids")) {
      result.label_ids = typeof row.label_ids === "string" && row.label_ids
        ? row.label_ids.split(",").filter(Boolean)
        : (Array.isArray(row.label_ids) ? row.label_ids : []);
    }

    if (has("linked_files")) {
      let files = row.linked_files;
      if (typeof files === "string") {
        try { files = JSON.parse(files); } catch (_) { files = []; }
      }
      result.linked_files = Array.isArray(files) ? files : [];
    }

    // Coerce due_date to YYYY-MM-DD so <input type="date"> renders it cleanly.
    if (has("due_date")) {
      let due = row.due_date;
      if (due) {
        if (due instanceof Date) due = due.toISOString().slice(0, 10);
        else if (typeof due === "string" && due.length >= 10) due = due.slice(0, 10);
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
      this._attachments[taskId] = Array.isArray(files) ? files : [];
    } catch (err) {
      this._attachments[taskId] = [];
    }
  }

  // Read text-field values straight from the live DOM. The Entry widget only
  // syncs on blur/commit/keyup; <input type="date"> change events are missed.
  _captureCreateDraft() {
    if (!this._createDefaults) return;
    const root = this.el && this.el.querySelector(".tasks-panel__create-modal");
    if (!root) return;
    const draft = this._createDefaults;
    const title = root.querySelector('input[name="title"]');
    const desc  = root.querySelector('textarea[name="description"]');
    const due   = root.querySelector('input[name="due_date"]');
    if (title) draft.title       = title.value || "";
    if (desc)  draft.description = desc.value  || "";
    if (due)   draft.due_date    = due.value   || "";
  }

  _captureDetailDraft() {
    if (!this._detailDraft) return;
    const root = this.el && this.el.querySelector(".tasks-panel__detail-panel");
    if (!root) return;
    const draft = this._detailDraft;
    const title = root.querySelector('input[name="title"]');
    const desc  = root.querySelector('textarea[name="description"]');
    const due   = root.querySelector('input[name="due_date"]');
    if (title) draft.title       = title.value || "";
    if (desc)  draft.description = desc.value  || "";
    if (due)   draft.due_date    = due.value   || "";
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
    const active = (typeof document !== "undefined") ? document.activeElement : null;
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
    if (this._creating && inCreate && inCreate.contains(scopeEl) && this._createDefaults) {
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
    const description = String(draft.description || "").trim();

    if (!title) return this._render();

    this._setSubmitting(".tasks-panel__create-submit", true);

    const labels = Array.isArray(draft.labels) ? draft.labels.slice() : [];
    const pendingFiles = Array.isArray(draft.pending_files) ? draft.pending_files.slice() : [];

    try {
      const raw = await this.postService({
        service: SERVICE.task.create,
        hub_id: this._hubId,
        title,
        description: description || null,
        status: draft.status || "todo",
        priority: draft.priority || "medium",
        due_date: dueRaw || null,
        assignee_uid: draft.assignee_uid || null,
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
            }).catch(() => null)
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
    const taskTitle  = String(task.title  || "").trim();
    if (draftTitle && draftTitle !== taskTitle) upd.title = draftTitle;
    if ((draft.description || "") !== (task.description || "")) upd.description = draft.description || "";
    if ((draft.priority || "medium") !== (task.priority || "medium")) upd.priority = draft.priority;
    const draftDue = (draft.due_date || "").trim();
    const taskDue  = task.due_date || "";
    const dueChanged = draftDue !== taskDue;
    if (Object.keys(upd).length || dueChanged) {
      // task_update SP overwrites due_date unconditionally — always send
      // the current value or another-field update would null the date.
      upd.due_date = draftDue || null;
      calls.push(this.postService({
        service: SERVICE.task.update,
        hub_id: this._hubId,
        id,
        ...upd,
      }).catch((err) => console.error("[tasks_panel] task.update failed:", err)));
    }

    if ((draft.status || "todo") !== (task.status || "todo")) {
      calls.push(this.postService({
        service: SERVICE.task.update_status,
        hub_id: this._hubId,
        id,
        status: draft.status,
      }).catch((err) => console.error("[tasks_panel] task.update_status failed:", err)));
    }

    if ((draft.assignee_uid || null) !== (task.assignee_uid || null)) {
      calls.push(this.postService({
        service: SERVICE.task.update_assignee,
        hub_id: this._hubId,
        id,
        assignee_uid: draft.assignee_uid || null,
      }).catch((err) => console.error("[tasks_panel] task.update_assignee failed:", err)));
    }

    const original = new Set(task.label_ids || []);
    const next = new Set(draft.labels || []);
    for (const lid of next) {
      if (!original.has(lid)) {
        calls.push(this.postService({
          service: SERVICE.task.link_label,
          hub_id: this._hubId,
          task_id: id,
          label_id: lid,
        }).catch(() => null));
      }
    }
    for (const lid of original) {
      if (!next.has(lid)) {
        calls.push(this.postService({
          service: SERVICE.task.unlink_label,
          hub_id: this._hubId,
          task_id: id,
          label_id: lid,
        }).catch(() => null));
      }
    }

    // Pending attachments — same flow as _commitTask: search-picked entries
    // already have nid; uploaded entries carry the File and need to land in
    // the folder body first.
    const pendingFiles = Array.isArray(draft.pending_files) ? draft.pending_files.slice() : [];
    for (const pf of pendingFiles) {
      calls.push((async () => {
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
      })());
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
    this._detailDraft = task ? {
      title: task.title || "",
      description: task.description || "",
      due_date: task.due_date || "",
      status: task.status || "todo",
      priority: task.priority || "medium",
      assignee_uid: task.assignee_uid || null,
      labels: Array.isArray(task.label_ids) ? task.label_ids.slice() : [],
      // Files picked but not yet uploaded/linked — _commitDetail processes
      // these (upload missing nids, then link_file) on Update.
      pending_files: [],
    } : null;
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
    const file = e.target?.files?.[0];
    if (!file) return;
    e.target.value = "";
    const scope = this._pendingUploadScope || "detail";
    this._pendingUploadScope = null;

    // Both create and detail use the same deferred-pending flow: stash the
    // File on the active draft and let _commitTask / _commitDetail do the
    // upload + link_file on submit.
    const draft = scope === "create" ? this._createDefaults : this._detailDraft;
    if (!draft) return;

    await this._ensureFolderFilenames();
    const { filename, extension } = this._resolveAvailableName(file.name);
    const localKey = `local:${Date.now()}:${file.name}`;
    const pending = (draft.pending_files || []).slice();
    pending.push({ localKey, file, filename, extension });
    draft.pending_files = pending;
    return this._refreshPendingList(scope);
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
    for (const f of (this._createDefaults?.pending_files || [])) {
      addName(f.filename, f.extension);
    }
    for (const f of (this._detailDraft?.pending_files || [])) {
      addName(f.filename, f.extension);
    }
    // Already-linked attachments on the open detail task
    if (this._detailId) {
      for (const f of (this._attachments[this._detailId] || [])) {
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
      const fullName = pf.extension ? `${pf.filename}.${pf.extension}` : pf.filename;
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
    this._attachments[taskId] = (this._attachments[taskId] || [])
      .filter((f) => f.file_nid !== fileNid);
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
    this.ensurePart("attachment-rows").then((rows) => {
      if (!rows || rows.isDestroyed?.()) return;
      const skel = require("./skeleton");
      rows.feed(skel.buildAttachmentRowsContent(this, attachments, taskId));
      if (rows.el) rows.el.dataset.empty = attachments.length ? "0" : "1";
    }).catch(() => { /* part not mounted yet */ });
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
    const scope = trigger.mget("searchScope") || (this._creating ? "create" : "detail");
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
    this.ensurePart(partName).then((list) => {
      if (!list || list.isDestroyed?.()) return;
      const skel = require("./skeleton");
      list.feed(skel.buildPendingListContent(this, pendingFiles));
      if (list.el) list.el.dataset.empty = pendingFiles.length ? "0" : "1";
    }).catch(() => { /* part not mounted yet */ });
  }

  _refreshFileSearchDropdown(scope) {
    if (!scope) return;
    const partName = `file-search-dropdown-${scope}`;
    this.ensurePart(partName).then((dropdown) => {
      if (!dropdown || dropdown.isDestroyed?.()) return;
      const ctx = scope === "create"
        ? { pendingFiles: (this._createDefaults && this._createDefaults.pending_files) || [] }
        : {
            existingFiles: (this._detailId && this._attachments[this._detailId]) || [],
            // Detail also has a pending list now — mark those linked too.
            pendingFiles: (this._detailDraft && this._detailDraft.pending_files) || [],
          };
      const skel = require("./skeleton");
      const content = skel.buildFileSearchDropdownContent(this, scope, ctx);
      dropdown.feed(content);
      if (dropdown.el) dropdown.el.dataset.empty = content.length ? "0" : "1";
    }).catch(() => { /* part not mounted yet */ });
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
      (draft.pending_files || []).map((f) => [f.nid || f.localKey, f])
    );
    if (!set.has(nid)) {
      set.set(nid, { nid, filename, extension: ext });
      draft.pending_files = Array.from(set.values());
    }
    // Close the suggestion dropdown after a pick. We no longer full-render,
    // so clear the search input value in the DOM directly.
    this._resetFileSearch();
    const inputEl = this.el?.querySelector(`input[name="file-search-${scope}"]`);
    if (inputEl) inputEl.value = "";
    this._refreshPendingList(scope);
    this._refreshFileSearchDropdown(scope);
  }

  _removePendingFile(trigger) {
    const nid = trigger.mget("fileNid");
    const localKey = trigger.mget("localKey");
    const keep = (f) => {
      if (localKey) return f.localKey !== localKey;
      if (nid) return f.nid !== nid;
      return true;
    };
    // Same row template renders in both scopes; filter both drafts and let
    // the surgical refresh skip whichever isn't mounted.
    if (this._createDefaults?.pending_files) {
      this._createDefaults.pending_files = this._createDefaults.pending_files.filter(keep);
    }
    if (this._detailDraft?.pending_files) {
      this._detailDraft.pending_files = this._detailDraft.pending_files.filter(keep);
    }
    this._refreshPendingList("create");
    this._refreshPendingList("detail");
    // "Linked" badges in the search dropdown depend on the pending set —
    // refresh both; ensurePart silently no-ops if the part isn't mounted.
    this._refreshFileSearchDropdown("create");
    this._refreshFileSearchDropdown("detail");
  }

  _updateStatusPills(modalSel, pillSel, newStatus) {
    const root = this.el && this.el.querySelector(modalSel);
    if (!root) return;
    const cols = this.getColumns();
    const colorByKey = {};
    cols.forEach((c) => { colorByKey[c.key] = c.color; });
    root.querySelectorAll(pillSel).forEach((pill) => {
      const status = pill.dataset.status;
      const active = status === newStatus;
      pill.dataset.active = active ? "1" : "0";
      if (active) {
        const color = colorByKey[status];
        pill.style.borderColor = color || "";
        pill.style.color = color || "";
      } else {
        pill.style.borderColor = "";
        pill.style.color = "";
      }
    });
  }

  _updatePriorityPills(modalSel, newPriority) {
    const root = this.el && this.el.querySelector(modalSel);
    if (!root) return;
    const pris = this.getPriorities();
    const colorByKey = {};
    pris.forEach((p) => { colorByKey[p.key] = p.color; });
    root.querySelectorAll(".tasks-panel__priority-pill").forEach((pill) => {
      const pri = pill.dataset.priority;
      const active = pri === newPriority;
      pill.dataset.active = active ? "1" : "0";
      if (active) {
        const color = colorByKey[pri];
        pill.style.borderColor = color || "";
        pill.style.color = color || "";
      } else {
        pill.style.borderColor = "";
        pill.style.color = "";
      }
    });
  }

  _updateLabelOptions(modalSel, selectedLabelIds) {
    const root = this.el && this.el.querySelector(modalSel);
    if (!root) return;
    const labels = this.getLabels();
    const colorById = {};
    labels.forEach((l) => { colorById[l.id] = l.color; });
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

  _applyAssigneeChange(kind, uid) {
    if (!this.el) return;
    this._setPickerOpenInDom(kind, false);
    const picker = this._findPickerEl(kind);
    if (picker) {
      const target = String(uid || "");
      picker.querySelectorAll(".tasks-panel__member-row").forEach((row) => {
        row.dataset.active = row.getAttribute("data-member-uid") === target ? "1" : "0";
      });
    }
    this.ensurePart(`${kind}-button`).then((btn) => {
      if (!btn || btn.isDestroyed?.()) return;
      btn.feed(require("./skeleton").buildAssigneeButtonContent(this, uid));
      if (btn.el) btn.el.dataset.open = "0";
    }).catch(() => { /* not mounted yet */ });
  }

  _applyPickerOpen(kind, isOpen) {
    if (!this.el || !kind) return;
    this._setPickerOpenInDom(kind, isOpen);
  }

  _setPickerOpenInDom(kind, isOpen) {
    const btn = this.el.querySelector(`.tasks-panel__assignee-button[data-picker-kind="${kind}"]`);
    if (btn) btn.dataset.open = isOpen ? "1" : "0";
    const picker = this._findPickerEl(kind);
    if (picker) picker.dataset.open = isOpen ? "1" : "0";
  }

  _findPickerEl(kind) {
    if (!this.el || !kind) return null;
    return this.el.querySelector(`.tasks-panel__member-picker[data-picker-kind="${kind}"]`);
  }

  _prepopulateInputs() {
    if (!this.el) return;
    const setVal = (sel, val) => {
      const el = this.el.querySelector(sel);
      if (el && (val || "") !== el.value) el.value = val || "";
    };
    if (this._creating && this._createDefaults) {
      const d = this._createDefaults;
      setVal('.tasks-panel__create-modal input[name="title"]', d.title);
      setVal('.tasks-panel__create-modal textarea[name="description"]', d.description);
    }
    if (this._detailDraft) {
      const d = this._detailDraft;
      setVal('.tasks-panel__detail-panel input[name="title"]', d.title);
      setVal('.tasks-panel__detail-panel textarea[name="description"]', d.description);
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
    const active = (typeof document !== "undefined") ? document.activeElement : null;
    if (active && this.el && this.el.contains(active) && active.getAttribute) {
      focusName = active.getAttribute("name");
      const inCreate = this.el.querySelector(".tasks-panel__create-modal");
      const inDetail = this.el.querySelector(".tasks-panel__detail-panel");
      if (inCreate && inCreate.contains(active)) scopeSel = ".tasks-panel__create-modal ";
      else if (inDetail && inDetail.contains(active)) scopeSel = ".tasks-panel__detail-panel ";
      try {
        cursorPos = active.selectionStart;
        cursorEnd = active.selectionEnd;
      } catch (_) { /* date / number inputs throw here */ }
    }

    this.feed(require("./skeleton")(this));
    // ui-core sets <input> values through a 200ms `waitElement` poll, so
    // the title/description start empty after each feed; pre-populate them
    // (sync + next frame as a safety net for late-mount children).
    this._prepopulateInputs();
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => this._prepopulateInputs());
    }

    if (focusName && typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        if (!this.el) return;
        const next = this.el.querySelector(`${scopeSel}[name="${focusName}"]`);
        if (!next || typeof next.focus !== "function") return;
        next.focus();
        if (cursorPos != null && typeof next.setSelectionRange === "function") {
          try { next.setSelectionRange(cursorPos, cursorEnd != null ? cursorEnd : cursorPos); } catch (_) {}
        }
      });
    }
  }

  // ── Skeleton accessors ─────────────────────────────────────────
  getColumns() { return COLUMNS; }
  getPriorities() { return PRIORITIES; }
  getMembers() { return this._members; }
  getLabels() { return this._labels; }
  getLabel(id) { return this._labels.find((l) => l.id === id) || null; }
  getMember(uid) { return this._members.find((m) => m.id === uid || m.uid === uid) || null; }

  getState() {
    return COLUMNS.reduce((acc, c) => {
      acc[c.key] = this._tasks.filter((t) => t.status === c.key);
      return acc;
    }, {});
  }

  isCreating() { return this._creating; }
  getCreateDraft() { return this._createDefaults || null; }
  getPickerOpen() { return this._pickerOpen; }
  getFileSearch() { return this._fileSearch; }

  getDetailTask() {
    if (!this._detailId) return null;
    return this._tasks.find((t) => t.id === this._detailId) || null;
  }
  getDetailDraft() { return this._detailDraft; }
  getDetailAttachments() {
    return (this._detailId && this._attachments[this._detailId]) || [];
  }
}

module.exports = __tasks_panel;
