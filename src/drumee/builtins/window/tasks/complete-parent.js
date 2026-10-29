// Completing a parent whose subtasks are still open. Mixed into
// __tasks_panel's prototype at the bottom of index.js, so `this` is the panel.
//
// The server only rolls UP (task_rollup_parent: the last subtask done
// completes the parent); nothing cascades down. So a parent moved to a done
// column left its children in To do and its badge at 0/3. Every path that can
// complete a task (board drag, List checkbox, List status cell, detail card
// Update) asks first, through _confirmCompleteParent:
//
//   Complete all → the parent moves as asked, then each open subtask is moved
//                  into the same done column (_completeSubtasks).
//   Cancel       → nothing is written; the caller leaves the parent as it was.
//
// Parent first, children after: once the parent is done the rollup on each
// child's write is a no-op (rule 3), so it logs no second "complete".

const { rowOf, ownedPatch } = require("./live-sync");

module.exports = {
  /**
   * The subtasks that would stay open if `task` moved to `nextStatus` — [] when
   * the move does not complete it, it already was complete, or it is itself a
   * subtask (one level of nesting).
   */
  _openSubtasksOf(task, nextStatus) {
    if (!task || task.parent_task_id) return [];
    if (!this.isDoneStatus(nextStatus) || this.isDoneStatus(task.status)) return [];
    return this.getSubtasks(task.id).filter((c) => !this.isDoneStatus(c.status));
  },

  /**
   * Ask before completing a parent with open subtasks.
   * @returns {Promise<Array|null>} the subtasks to complete alongside ([] when
   *   there was nothing to ask), or null when the user cancelled.
   */
  async _confirmCompleteParent(task, nextStatus) {
    // A member who cannot write gets the write guard's refusal alone, not a
    // question about a change that cannot land.
    if (!this._mayWriteTasks()) return [];
    const open = this._openSubtasksOf(task, nextStatus);
    if (!open.length) return [];
    if (typeof Wm === "undefined" || !Wm.confirm) return [];
    const n = open.length;
    const ok = await Wm.confirm({
      title: LOCALE.TASK_OPEN_SUBTASKS_TITLE,
      message: n === 1
        ? LOCALE.TASK_OPEN_SUBTASK_ONE
        : LOCALE.TASK_OPEN_SUBTASKS_MANY.format(n),
      confirm: LOCALE.TASK_COMPLETE_ALL,
      cancel: LOCALE.CANCEL,
      cancel_type: "secondary",
      mode: "hbf",
    })
      .then(() => true)
      // Cancel, the X and Escape all reject.
      .catch(() => false);
    return ok ? open : null;
  },

  /**
   * Move `kids` into `status` (the done column their parent just went to).
   * One at a time: each write lands on top of that column (task_update_status).
   * @returns {Promise<boolean>} whether every subtask landed
   */
  async _completeSubtasks(parentId, kids, status) {
    if (!kids || !kids.length) return true;
    let ok = true;
    for (const kid of kids) {
      const resp = await this.postService({
        service: SERVICE.task.update_status,
        hub_id: this._hubId,
        id: kid.id,
        status,
      }).catch(() => undefined);
      const row = rowOf(resp);
      if (row) this._mergeTask(ownedPatch("task.update_status", row));
      else ok = false;
    }
    this._syncSubtaskBadges(parentId);
    this._repaintBoard();
    if (!ok) this._alertWriteFailed();
    return ok;
  },
};
