const COLUMNS = [
  { key: "todo", label: "To Do", color: "#AEAEB2" },
  { key: "in_progress", label: "In Progress", color: "#65D0EA" },
  { key: "to_review", label: "To review", color: "#E8A13B" },
  { key: "complete", label: "Complete", color: "#54B684" },
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
    this._editingId = null;
    this._detailId = null;
    this._attachments = {};
    this._managingLabels = false;
    this._labelDraft = null;
    this._pickerOpen = null;     // "assignee" | "label" | null
    this._fileSearch = { query: "", results: [], scope: null }; // scope: "create" | "detail"
    this._fileSearchTimer = null;
    this.bindEvent(_a.live);
  }

  onBeforeDestroy() {
    this.unbindEvent(_a.live);
    if (this._fileSearchTimer) clearTimeout(this._fileSearchTimer);
  }

  async onDomRefresh() {
    await Promise.all([
      this._loadTasks(),
      this._loadMembers(),
      this._loadLabels(),
    ]);
    this._render();
  }

  async onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.get(_a.service);
    switch (service) {
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
          const uid = trigger.mget("memberUid");
          this._createDefaults.assignee_uid = uid || null;
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

      case "edit-title":
        this._editingId = trigger.mget("taskId");
        return this._render();

      case "commit-title":
        return this._commitTitle(trigger);

      case "commit-description":
        return this._commitDescription(trigger);

      case "commit-due-date":
        return this._commitDueDate(trigger);

      case "set-status":
        return this._setStatus(trigger);

      case "set-priority":
        return this._setPriority(trigger);

      case "set-assignee":
        return this._setAssignee(trigger);

      case "toggle-task-label":
        return this._toggleTaskLabel(trigger);

      case "open-detail":
        return this._openDetail(trigger.mget("taskId"));

      case "close-detail":
        this._detailId = null;
        this._pickerOpen = null;
        this._resetFileSearch();
        return this._render();

      case "file-search-input":
        return this._scheduleFileSearch(trigger);

      case "link-search-result":
        return this._linkSearchResult(trigger);

      case "remove-pending-file":
        return this._removePendingFile(trigger);

      case "manage-labels":
        this._managingLabels = true;
        return this._render();

      case "close-manage-labels":
        this._managingLabels = false;
        this._labelDraft = null;
        return this._render();

      case "new-label-form":
        this._labelDraft = { name: "", color: "#65D0EA" };
        return this._render();

      case "cancel-new-label":
        this._labelDraft = null;
        return this._render();

      case "pick-label-color":
        if (this._labelDraft) {
          this._labelDraft.color = trigger.mget("labelColor");
        }
        return this._render();

      case "commit-new-label":
        return this._commitNewLabel();

      case "delete-label":
        return this._deleteLabel(trigger);

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
        this._loadTasks().then(() => this._render());
        return;
      case SERVICE.task.link_file:
      case SERVICE.task.unlink_file:
        if (this._detailId) {
          this._refreshAttachments(this._detailId).then(() => this._render());
        }
        return;
      case SERVICE.task.link_label:
      case SERVICE.task.unlink_label:
        this._loadTasks().then(() => this._render());
        return;
      case SERVICE.label.create:
      case SERVICE.label.update:
      case SERVICE.label.delete:
        this._loadLabels().then(() => this._render());
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

  _normalizeTask(row) {
    const labels = typeof row.label_ids === "string" && row.label_ids
      ? row.label_ids.split(",").filter(Boolean)
      : Array.isArray(row.label_ids) ? row.label_ids : [];
    let files = row.linked_files;
    if (typeof files === "string") {
      try { files = JSON.parse(files); } catch { files = []; }
    }
    if (!Array.isArray(files)) files = [];
    return { ...row, label_ids: labels, linked_files: files };
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

  async _commitTask() {
    const draft = this._createDefaults || {};
    const fields = (this.getData?.(_a.formItem)) || {};
    const title = String(fields.title || "").trim();
    const dueRaw = String(fields.due_date || "").trim();
    const description = String(fields.description || "").trim();

    if (!title) {
      this._createDefaults = { ...draft, title: "", description, due_date: dueRaw };
      return this._render();
    }

    const labels = Array.isArray(draft.labels) ? draft.labels.slice() : [];
    const pendingFiles = Array.isArray(draft.pending_files) ? draft.pending_files.slice() : [];
    this._creating = false;
    this._createDefaults = null;
    this._pickerOpen = null;
    this._resetFileSearch();

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
        // Attach selected labels + pending files in parallel.
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
      if (this._detailId === id) this._detailId = null;
    } catch (err) {
      console.error("[tasks_panel] task.delete failed:", err);
    }
    this._render();
  }

  async _commitTitle(trigger) {
    const id = trigger.mget("taskId") || this._editingId;
    const inputEl = trigger?.el?.querySelector("input");
    const title = (inputEl?.value || "").trim();
    this._editingId = null;
    if (!id || !title) return this._render();

    const updated = await this.postService({
      service: SERVICE.task.update,
      hub_id: this._hubId,
      id,
      title,
    });
    this._mergeTask(Array.isArray(updated) ? updated[0] : updated);
    this._render();
  }

  async _commitDescription(trigger) {
    const id = trigger.mget("taskId") || this._detailId;
    const textareaEl = trigger?.el?.querySelector("textarea");
    if (!id || !textareaEl) return;
    const description = textareaEl.value || "";

    const updated = await this.postService({
      service: SERVICE.task.update,
      hub_id: this._hubId,
      id,
      description,
    });
    this._mergeTask(Array.isArray(updated) ? updated[0] : updated);
    this._render();
  }

  async _commitDueDate(trigger) {
    const id = trigger.mget("taskId");
    const inputEl = trigger?.el?.querySelector("input");
    const due = (inputEl?.value || "").trim() || null;
    if (!id) return;

    const updated = await this.postService({
      service: SERVICE.task.update,
      hub_id: this._hubId,
      id,
      due_date: due,
    });
    this._mergeTask(Array.isArray(updated) ? updated[0] : updated);
    this._render();
  }

  async _setStatus(trigger) {
    const id = trigger.mget("taskId");
    const status = trigger.mget("taskStatus");
    if (!id || !status) return;

    const updated = await this.postService({
      service: SERVICE.task.update_status,
      hub_id: this._hubId,
      id,
      status,
    });
    this._mergeTask(Array.isArray(updated) ? updated[0] : updated);
    this._render();
  }

  async _setPriority(trigger) {
    const id = trigger.mget("taskId");
    const priority = trigger.mget("taskPriority");
    if (!id || !priority) return;

    const updated = await this.postService({
      service: SERVICE.task.update,
      hub_id: this._hubId,
      id,
      priority,
    });
    this._mergeTask(Array.isArray(updated) ? updated[0] : updated);
    this._render();
  }

  async _setAssignee(trigger) {
    const id = trigger.mget("taskId") || this._detailId;
    const uid = trigger.mget("memberUid") || null;
    if (!id) return;
    this._pickerOpen = null;

    const updated = await this.postService({
      service: SERVICE.task.update_assignee,
      hub_id: this._hubId,
      id,
      assignee_uid: uid,
    });
    this._mergeTask(Array.isArray(updated) ? updated[0] : updated);
    this._render();
  }

  async _toggleTaskLabel(trigger) {
    const taskId = trigger.mget("taskId") || this._detailId;
    const labelId = trigger.mget("labelId");
    if (!taskId || !labelId) return;

    const task = this._tasks.find((t) => t.id === taskId);
    const has = task && Array.isArray(task.label_ids) && task.label_ids.includes(labelId);
    const service = has ? SERVICE.task.unlink_label : SERVICE.task.link_label;

    await this.postService({
      service,
      hub_id: this._hubId,
      task_id: taskId,
      label_id: labelId,
    });
    if (task) {
      const next = new Set(task.label_ids || []);
      if (has) next.delete(labelId); else next.add(labelId);
      task.label_ids = Array.from(next);
    }
    this._render();
  }

  async _commitNewLabel() {
    const draft = this._labelDraft || {};
    const fields = (this.getData?.(_a.formItem)) || {};
    const name = String(fields.label_name || draft.name || "").trim();
    if (!name) return;

    try {
      await this.postService({
        service: SERVICE.label.create,
        hub_id: this._hubId,
        name,
        color: draft.color || "#65D0EA",
      });
      this._labelDraft = null;
      await this._loadLabels();
    } catch (err) {
      console.error("[tasks_panel] label.create failed:", err);
    }
    this._render();
  }

  async _deleteLabel(trigger) {
    const id = trigger.mget("labelId");
    if (!id) return;
    try {
      await this.postService({
        service: SERVICE.label.delete,
        hub_id: this._hubId,
        id,
      });
      this._labels = this._labels.filter((l) => l.id !== id);
      // Drop the deleted label from any cached tasks.
      this._tasks.forEach((t) => {
        if (Array.isArray(t.label_ids)) {
          t.label_ids = t.label_ids.filter((lid) => lid !== id);
        }
      });
    } catch (err) {
      console.error("[tasks_panel] label.delete failed:", err);
    }
    this._render();
  }

  async _openDetail(id) {
    if (!id) return;
    this._detailId = id;
    await this._refreshAttachments(id);
    this._render();
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
      this._fileSearch.results = [];
      return this._render();
    }
    this._fileSearchTimer = setTimeout(() => {
      this._runFileSearch(query, scope);
    }, 250);
  }

  async _runFileSearch(query, scope) {
    if (this._fileSearch.query !== query) return; // user moved on
    const taskId = scope === "detail" ? this._detailId : null;
    try {
      const rows = await this.fetchService({
        service: SERVICE.task.search_files,
        hub_id: this._hubId,
        pattern: query,
        task_id: taskId || undefined,
      });
      // discard stale responses
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
      // Stash on the draft — the actual link_file call happens after task.create.
      const set = new Map(
        (this._createDefaults.pending_files || []).map((f) => [f.nid, f])
      );
      if (!set.has(nid)) {
        set.set(nid, { nid, filename, extension: ext });
        this._createDefaults.pending_files = Array.from(set.values());
      }
      // Drop the row from the visible search results so the user sees feedback.
      this._fileSearch.results = (this._fileSearch.results || [])
        .filter((r) => r.nid !== nid);
      return this._render();
    }

    // Detail-panel scope: link immediately.
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
      this._fileSearch.results = (this._fileSearch.results || [])
        .filter((r) => r.nid !== nid);
      // Reload tasks so the card picks up the new linked_files entry.
      await this._loadTasks();
    } catch (err) {
      console.error("[tasks_panel] task.link_file failed:", err);
    }
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
    this.feed(require("./skeleton")(this));
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
  getEditingId() { return this._editingId; }
  getPickerOpen() { return this._pickerOpen; }
  isManagingLabels() { return this._managingLabels; }
  getLabelDraft() { return this._labelDraft; }
  getFileSearch() { return this._fileSearch; }

  getDetailTask() {
    if (!this._detailId) return null;
    return this._tasks.find((t) => t.id === this._detailId) || null;
  }
  getDetailAttachments() {
    return (this._detailId && this._attachments[this._detailId]) || [];
  }
}

module.exports = __tasks_panel;
