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
    // A child marked read while this fetch is in flight keeps its 0: the
    // server answered before the mark, so its count for that child is stale
    // (open P → click A at once → back to P would flash the old badge).
    const startSeq = this._commentReadSeq || 0;
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
    const readAt = this._commentReadAt || new Map();
    const markedSince = (id) => (readAt.get(id) || 0) > startSeq;
    (this.getSubtasks(parentId) || []).forEach((c) => {
      if (!markedSince(c.id)) this._commentUnread.delete(c.id);
    });
    rows.forEach((r) => {
      const n = Number(r && r.unread) || 0;
      if (r && r.task_id && n > 0 && !markedSince(r.task_id)) {
        this._commentUnread.set(r.task_id, n);
      }
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
    // Stamp the mark so a count fetch already in flight leaves it alone.
    this._commentReadSeq = (this._commentReadSeq || 0) + 1;
    if (!this._commentReadAt) this._commentReadAt = new Map();
    this._commentReadAt.set(taskId, this._commentReadSeq);
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
      const parentId = task.parent_task_id;
      if (this._detailId !== parentId) return;
      // Bump at once so the badge moves with the push, then let the server's
      // count overwrite it — a local +1 drifts (a push racing the open's own
      // fetch counts the comment twice).
      if (!this._commentUnread) this._commentUnread = new Map();
      this._commentUnread.set(taskId, this.getCommentUnread(taskId) + 1);
      this._refreshSubtaskSection();
      this._reloadCommentUnread(parentId);
      return;
    }

    if (service === SERVICE.task.comment_delete) {
      const parentId = task.parent_task_id;
      if (this._detailId !== parentId) return;
      this._reloadCommentUnread(parentId);
    }
  },

  /** Re-read `parentId`'s counts and repaint if its detail is still open. */
  _reloadCommentUnread(parentId) {
    return this._loadCommentUnread(parentId).then(() => {
      if (this._detailId === parentId) this._refreshSubtaskSection();
    });
  },

  /**
   * task.comment_mark_read push — the server sends it only to the reader's
   * OWN other sockets, so this is "I read it in another tab/device". Drop the
   * count; repaint if the badge is on screen. No mark is posted back (that
   * would echo forever).
   */
  _onCommentReadPush(data) {
    const taskId = data && data.task_id;
    if (!taskId || !this._commentUnread) return;
    if (!this._commentUnread.has(taskId)) return;
    this._commentUnread.delete(taskId);
    const task = this.getTaskById(taskId);
    if (task && this._detailId && this._detailId === task.parent_task_id) {
      this._refreshSubtaskSection();
    }
  },
};
