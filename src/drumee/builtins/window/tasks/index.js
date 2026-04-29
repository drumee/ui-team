const COLUMNS = [
  { key: "todo", label: "To Do", color: "#AEAEB2" },
  { key: "in_progress", label: "In Progress", color: "#65D0EA" },
  { key: "to_review", label: "To review", color: "#E8A13B" },
  { key: "complete", label: "Complete", color: "#54B684" },
];

class __tasks_panel extends LetcBox {

  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    this._hubId = this.mget(_a.hub_id) || Host.get(_a.id);
    this._tasks = [];
    this._creating = false;
    this._createDefaults = null;
    this._editingId = null;
    this._detailId = null;
    this._attachments = {};
    this.bindEvent(_a.live);
  }

  onBeforeDestroy() {
    this.unbindEvent(_a.live);
  }

  async onDomRefresh() {
    await this._loadTasks();
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
          due_date: "",
        };
        return this._render();

      case "commit-task":
        return this._commitTask();

      case "cancel-add":
        this._creating = false;
        this._createDefaults = null;
        return this._render();

      case "create-status":
        if (this._createDefaults) {
          this._createDefaults.status = trigger.mget("taskStatus");
        }
        return this._render();

      case "remove-task":
        return this._removeTask(trigger);

      case "edit-title":
        this._editingId = trigger.mget("taskId");
        return this._render();

      case "commit-title":
        return this._commitTitle(trigger);

      case "commit-due-date":
        return this._commitDueDate(trigger);

      case "set-status":
        return this._setStatus(trigger);

      case "open-detail":
        return this._openDetail(trigger.mget("taskId"));

      case "close-detail":
        this._detailId = null;
        return this._render();

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
      case SERVICE.task.delete:
        this._loadTasks().then(() => this._render());
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
      this._tasks = Array.isArray(rows) ? rows : [];
    } catch (err) {
      this._tasks = [];
    }
  }

  async _commitTask() {
    const draft = this._createDefaults || {};
    const fields = (this.getData?.(_a.formItem)) || {};
    const title = String(fields.title || "").trim();
    const dueRaw = String(fields.due_date || "").trim();

    if (!title) {
      this._createDefaults = { ...draft, title: "", due_date: dueRaw };
      return this._render();
    }

    this._creating = false;
    this._createDefaults = null;

    try {
      const raw = await this.postService({
        service: SERVICE.task.create,
        hub_id: this._hubId,
        title,
        status: draft.status || "todo",
        due_date: dueRaw || null,
      });
      const row = Array.isArray(raw) ? raw[0] : raw;
      if (row && row.id) {
        this._tasks.push(row);
      } else {
        await this._loadTasks();
      }
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
      // Server returns 200 + error body when permission is denied; only
      // remove on confirmed success.
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

  async _openDetail(id) {
    if (!id) return;
    this._detailId = id;
    try {
      const files = await this.fetchService({
        service: SERVICE.task.get_linked_files,
        hub_id: this._hubId,
        task_id: id,
      });
      this._attachments[id] = Array.isArray(files) ? files : [];
    } catch (err) {
      this._attachments[id] = [];
    }
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

  _mergeTask(row) {
    if (!row || !row.id) return;
    const idx = this._tasks.findIndex((t) => t.id === row.id);
    if (idx === -1) this._tasks.push(row);
    else this._tasks[idx] = { ...this._tasks[idx], ...row };
  }

  _render() {
    this.feed(require("./skeleton")(this));
  }

  getColumns() { return COLUMNS; }

  getState() {
    return COLUMNS.reduce((acc, c) => {
      acc[c.key] = this._tasks.filter((t) => t.status === c.key);
      return acc;
    }, {});
  }

  isCreating() { return this._creating; }
  getCreateDraft() { return this._createDefaults || null; }
  getEditingId() { return this._editingId; }
  getDetailTask() {
    if (!this._detailId) return null;
    return this._tasks.find((t) => t.id === this._detailId) || null;
  }
  getDetailAttachments() {
    return (this._detailId && this._attachments[this._detailId]) || [];
  }
}

module.exports = __tasks_panel;
