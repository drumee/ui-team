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
    this._hubId = this.mget(_a.hub_id) || Host.get(_a.id);
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
    this.bindEvent(_a.live);
  }

  onBeforeDestroy() {
    this.unbindEvent(_a.live);
    if (this._fileSearchTimer) clearTimeout(this._fileSearchTimer);
  }

  async onDomRefresh() {
    this._installDnd();
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
        this._resetFileSearch();
        return this._render();

      case "commit-task":
        return this._commitTask();

      case "cancel-add":
        this._creating = false;
        this._createDefaults = null;
        this._pickerOpen = null;
        this._resetFileSearch();
        return this._render();

      case "create-status":
        if (this._createDefaults) {
          this._createDefaults.status = trigger.mget("taskStatus");
        }
        return this._render();

      case "create-priority":
        if (this._createDefaults) {
          this._createDefaults.priority = trigger.mget("taskPriority");
        }
        return this._render();

      case "create-assignee":
        if (this._createDefaults) {
          this._createDefaults.assignee_uid = trigger.mget("memberUid") || null;
          this._pickerOpen = null;
        }
        return this._render();

      case "create-toggle-label":
        if (this._createDefaults) {
          const id = trigger.mget("labelId");
          const set = new Set(this._createDefaults.labels);
          if (set.has(id)) set.delete(id); else set.add(id);
          this._createDefaults.labels = Array.from(set);
        }
        return this._render();

      case "toggle-picker":
        this._pickerOpen = this._pickerOpen === trigger.mget("pickerKind")
          ? null
          : trigger.mget("pickerKind");
        return this._render();

      case "remove-task":
        return this._removeTask(trigger);

      case "commit-description":
      case "commit-due-date":
        // Detail-panel text inputs commit into the local draft only; the
        // server update happens when "Update" is clicked.
        return this._render();

      case "set-status":
        if (this._detailDraft) this._detailDraft.status = trigger.mget("taskStatus");
        return this._render();

      case "set-priority":
        if (this._detailDraft) this._detailDraft.priority = trigger.mget("taskPriority");
        return this._render();

      case "set-assignee":
        if (this._detailDraft) {
          this._detailDraft.assignee_uid = trigger.mget("memberUid") || null;
          this._pickerOpen = null;
        }
        return this._render();

      case "toggle-task-label":
        if (this._detailDraft) {
          const id = trigger.mget("labelId");
          const set = new Set(this._detailDraft.labels || []);
          if (set.has(id)) set.delete(id); else set.add(id);
          this._detailDraft.labels = Array.from(set);
        }
        return this._render();

      case "commit-detail":
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

      case "pick-attachment":
        return this._pickAttachment();

      case "unlink-attachment":
        return this._unlinkAttachment(trigger);

      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }

  onPartReady(child, pn) {
    if (pn === "task-fileselector") {
      child.el.onchange = (e) => this._onAttachmentPicked(e);
      return;
    }
    if (super.onPartReady) super.onPartReady(child, pn);
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
        await Promise.all([
          ...labels.map((labelId) =>
            this.postService({
              service: SERVICE.task.link_label,
              hub_id: this._hubId,
              task_id: row.id,
              label_id: labelId,
            }).catch(() => null)
          ),
          ...pendingFiles.map((f) =>
            this.postService({
              service: SERVICE.task.link_file,
              hub_id: this._hubId,
              task_id: row.id,
              file_nid: f.nid,
            }).catch(() => null)
          ),
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

    if (calls.length) await Promise.all(calls);

    await this._loadTasks();
    this._detailId = null;
    this._detailDraft = null;
    this._pickerOpen = null;
    this._resetFileSearch();
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
    } : null;
    this._render();
    this._refreshAttachments(id).then(() => {
      if (this._detailId === id) this._render();
    });
  }

  _pickAttachment() {
    return this.ensurePart("task-fileselector").then((sel) => {
      const input = sel.el.querySelector?.("input[type='file']") || sel.el;
      input.click?.();
    });
  }

  _onAttachmentPicked(e) {
    const file = e.target?.files?.[0];
    if (!file || !this._detailId) return;
    e.target.value = "";
    this._pendingLinkTaskId = this._detailId;
    this.uploadFile(file, { hub_id: this._hubId, nid: this._hubId });
  }

  async onUploadResponse(data) {
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
    this._render();
  }

  // ── File picker (search-and-link) ─────────────────────────────
  _resetFileSearch() {
    if (this._fileSearchTimer) {
      clearTimeout(this._fileSearchTimer);
      this._fileSearchTimer = null;
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
      if (hadResults) this._render();
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
    this._render();
  }

  async _linkSearchResult(trigger) {
    const nid = trigger.mget("fileNid");
    const filename = trigger.mget("fileName");
    const ext = trigger.mget("fileExt");
    const scope = trigger.mget("searchScope");
    if (!nid) return;

    if (scope === "create" && this._createDefaults) {
      // Stash on the draft — the actual link_file fires after task.create.
      const set = new Map(
        (this._createDefaults.pending_files || []).map((f) => [f.nid, f])
      );
      if (!set.has(nid)) {
        set.set(nid, { nid, filename, extension: ext });
        this._createDefaults.pending_files = Array.from(set.values());
      }
      // Close the suggestion dropdown after a pick.
      this._resetFileSearch();
      return this._render();
    }

    const taskId = this._detailId;
    if (!taskId) return;
    try {
      const links = await this.postService({
        service: SERVICE.task.link_file,
        hub_id: this._hubId,
        task_id: taskId,
        file_nid: nid,
      });
      this._attachments[taskId] = Array.isArray(links) ? links : [];
      await this._loadTasks();
    } catch (err) {
      console.error("[tasks_panel] task.link_file failed:", err);
    }
    this._resetFileSearch();
    this._render();
  }

  _removePendingFile(trigger) {
    if (!this._createDefaults) return;
    const nid = trigger.mget("fileNid");
    this._createDefaults.pending_files = (this._createDefaults.pending_files || [])
      .filter((f) => f.nid !== nid);
    this._render();
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
