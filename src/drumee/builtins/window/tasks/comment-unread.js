// Unread comment counts for the subtasks of the open task — the badge in each
// detail-panel subtask row (skeleton/helpers.js commentUnreadBadge). Mixed
// into __tasks_panel's prototype at the bottom of index.js, so `this` is the
// panel.
//
// State: `_commentUnread` — Map task id → unread count, for the current user.
// Unknown = 0. Filled per parent by _loadCommentUnread when a parent's detail
// opens; zeroed by _markCommentsRead when a subtask's detail opens (that is
// what "read" means); bumped live by a peer's task.comment_create.
//
// Server: task.comment_unread / task.comment_mark_read (both src:read, so a
// view-only member marks too). Neither is in TASK_MUTATIONS — a mark is not a
// task write and must never meet the read-only guard. A server or DB without
// them answers undefined / [] and the badges simply never appear.

module.exports = {
  getCommentUnread(taskId) {
    if (!taskId || !this._commentUnread) return 0;
    return this._commentUnread.get(taskId) || 0;
  },

  /**
   * Fetch the caller's unread counts for `parentId`'s children. Replaces those
   * children's entries (one the server no longer lists is now 0). Does not
   * repaint — the caller decides whether the detail is still on this parent.
   */
  async _loadCommentUnread(parentId) {
    if (!parentId) return;
    const rows = await this.fetchService({
      service: SERVICE.task.comment_unread,
      hub_id: this._hubId,
      parent_id: parentId,
      // fetchService GETs are HTTP-cached; a read-after-mark must not be.
      _ts: Date.now(),
    });
    // undefined = the call did not complete (or an older server): keep what
    // we had rather than wiping badges on a transient failure.
    if (!Array.isArray(rows)) return;
    if (!this._commentUnread) this._commentUnread = new Map();
    (this.getSubtasks(parentId) || []).forEach((c) =>
      this._commentUnread.delete(c.id),
    );
    rows.forEach((r) => {
      const n = Number(r && r.unread) || 0;
      if (r && r.task_id && n > 0) this._commentUnread.set(r.task_id, n);
    });
  },

  /**
   * Everything on `taskId` is now read for this user. The local count drops
   * first and synchronously, so walking back to the parent shows no badge
   * before the server has even answered. Fire-and-forget.
   */
  _markCommentsRead(taskId) {
    if (!taskId) return;
    if (!this._commentUnread) this._commentUnread = new Map();
    this._commentUnread.delete(taskId);
    Promise.resolve(
      this.postService({
        service: SERVICE.task.comment_mark_read,
        hub_id: this._hubId,
        task_id: taskId,
      }),
    ).catch(() => {});
  },

  /**
   * A comment push (from onWsMessage). Only matters when the open detail is
   * the commented task's parent (bump its badge) or the commented subtask
   * itself (the user is looking at it — keep it read).
   */
  _onPeerCommentForUnread(service, data) {
    const taskId = data && data.task_id;
    if (!taskId || !this._detailId) return;
    const task = this.getTaskById(taskId);
    if (!task || !this.isSubtask(task)) return;

    if (service === SERVICE.task.comment_create) {
      if (String(data.author_uid) === String(Visitor.id)) return;
      if (this._detailId === taskId) return this._markCommentsRead(taskId);
      if (this._detailId !== task.parent_task_id) return;
      if (!this._commentUnread) this._commentUnread = new Map();
      this._commentUnread.set(taskId, this.getCommentUnread(taskId) + 1);
      this._refreshSubtaskSection();
      return;
    }

    if (service === SERVICE.task.comment_delete) {
      const parentId = task.parent_task_id;
      if (this._detailId !== parentId) return;
      this._loadCommentUnread(parentId).then(() => {
        if (this._detailId === parentId) this._refreshSubtaskSection();
      });
    }
  },
};
