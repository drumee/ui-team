/* ==================================================================== *
 * desk_dept_tab
 * The topbar's department crumb — B2B Org Structure, Figma 1003:172774.
 *
 * Sits between the org chip and the workspace chip and names the department
 * the OPEN workspace belongs to. Its dropdown switches department (opening the
 * org screen narrowed to it), renames the current one and creates new ones.
 *
 * Draws nothing at all when there is nothing to name: on the user's own desk,
 * in a personal workspace, in an ungrouped workspace, and for a member who
 * cannot see the workspace's department. The topbar then reads exactly as it
 * did before departments existed.
 * ==================================================================== */
const {
  myDepartments,
  invalidate,
  departmentOf,
  currentHubId,
} = require("libs/org-departments");
const { invalidate: invalidateOverview } = require("libs/org-overview");

class __desk_dept_tab extends LetcBox {

  /**
   *
   */
  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    // Any department mutation (the org view, the dialog, this dropdown) and
    // any workspace creation ends in org:refresh.
    RADIO_BROADCAST.on("org:refresh", this._refresh, this);
    RADIO_BROADCAST.on("department:changed", this._refresh, this);
    // The open workspace changed: same list, another department maybe.
    RADIO_BROADCAST.on("breadcrumb:content", this._repaint, this);
  }

  /**
   *
   */
  onBeforeDestroy() {
    RADIO_BROADCAST.off("org:refresh", this._refresh, this);
    RADIO_BROADCAST.off("department:changed", this._refresh, this);
    RADIO_BROADCAST.off("breadcrumb:content", this._repaint, this);
  }

  /**
   *
   */
  onDomRefresh() {
    this._load();
  }

  /**
   * @param {Boolean} [force]
   */
  _load(force) {
    return myDepartments(this, force).then((data) => {
      this._data = data;
      return this._repaint();
    });
  }

  /**
   * Drop the cache and re-read.
   */
  _refresh() {
    invalidate();
    return this._load(1);
  }

  /**
   * Draw the crumb for the open workspace, or nothing.
   *
   * Skips the rebuild when the department shown and its list are unchanged:
   * breadcrumb:content fires on every folder move inside a workspace, and
   * rebuilding the menu each time would close it under the user.
   */
  _repaint() {
    if (this.isDestroyed && this.isDestroyed()) return;
    const data = this._data;
    const dept = data ? departmentOf(data, currentHubId()) : null;
    const sig = dept
      ? JSON.stringify([dept.id, dept.name, data.can_manage, data.departments.map((d) => [d.id, d.name])])
      : "";
    if (sig === this._sig) return;
    this._sig = sig;
    this._dept = dept;
    if (this.el) this.el.dataset.empty = dept ? "0" : "1";
    if (!dept) return this.feed([]);
    this.feed(require("./skeleton")(this, data, dept));
  }

  /**
   *
   */
  onPartReady(child, pn) {
    if (pn === "dept-menu") this._menu = child;
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  /**
   * Close the dropdown, the same way the org chip closes its own.
   */
  _closeMenu() {
    const menu = this._menu;
    if (!menu || !menu.el || (menu.isDestroyed && menu.isDestroyed())) return;
    if (_.isFunction(menu._triggerToggle)) menu._triggerToggle();
  }

  /**
   * Swap the header's name for an entry — the org chip's rename, here.
   *
   * @param {String} id
   */
  _rename(id) {
    const pfx = this.fig.family;
    const dept = this._dept;
    if (!dept || String(dept.id) !== String(id)) return;
    return this.ensurePart("dept-name-row").then((part) => {
      if (!part) return;
      part.feed(
        Skeletons.Entry({
          className: `${pfx}__rename-entry`,
          value: dept.name,
          mode: _a.commit,
          require: "any",
          service: "commit-department-name",
          deptId: id,
          preselect: 1,
          removeOnEscape: true,
          uiHandler: [this],
        }),
      );
    });
  }

  /**
   * @param {View} cmd the committing entry
   */
  async _commitRename(cmd) {
    const id = cmd.mget("deptId");
    const name = String((cmd.getValue && cmd.getValue()) || "").trim();
    if (!id || !name) {
      this._sig = null;
      return this._repaint();
    }
    const res = await this.postService(SERVICE.organization.department_rename, {
      hub_id: Visitor.id,
      department_id: id,
      name,
    }).catch(() => null);
    if (!res || res.status) {
      const key = res && res.status;
      if (Wm && Wm.alert) Wm.alert((key && LOCALE[key]) || LOCALE.SOMETHING_WENT_WRONG);
      this._sig = null;
      return this._repaint();
    }
    invalidateOverview();
    RADIO_BROADCAST.trigger("org:refresh");
  }

  /**
   * @param {View} cmd
   * @param {Object} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || (cmd.get && cmd.get(_a.service));
    switch (service) {
      case "switch-department":
        this._closeMenu();
        return this.triggerHandlers({
          service: "open-department-view",
          departmentId: cmd.mget("deptId"),
        });

      case "new-department":
        this._closeMenu();
        return this.triggerHandlers({ service: "new-department" });

      case "rename-department":
        return this._rename(cmd.mget("deptId"));

      case "commit-department-name":
        return this._commitRename(cmd);

      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __desk_dept_tab;
