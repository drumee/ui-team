/* ==================================================================== *
 * desk_department_form
 * "Create new department" — B2B Org Structure Figma 900:151281.
 *
 * Hosted by the window manager's wrapper-modal (Wm "new-department-form"),
 * the same host as "Create new folder" and the workspace form, so it shares
 * their overlay and their close-when-empty plumbing.
 *
 * Replaces the org view's inline entry: the frame draws a dialog, and a
 * dialog is reachable from the topbar's department dropdown too, where there
 * is no org view on screen to put an entry into.
 * ==================================================================== */
const { invalidate: invalidateOverview } = require("libs/org-overview");
const { invalidate: invalidateDepartments } = require("libs/org-departments");

class __desk_department_form extends LetcBox {

  /**
   *
   */
  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
  }

  /**
   *
   */
  onDomRefresh() {
    this.feed(require("./skeleton")(this));
  }

  /**
   * Leave the way the folder form does: clearing the wrapper is what lets
   * Wm's close-when-empty hook drop the overlay.
   */
  _close() {
    if (this.parent && _.isFunction(this.parent.clear)) {
      return this.parent.clear();
    }
    return this.goodbye();
  }

  /**
   * Show a message under the name field.
   *
   * @param {String} message
   */
  _error(message) {
    return this.ensurePart("error").then((p) => {
      if (!p) return;
      p.setState(message ? 1 : 0);
      p.set({ content: message || "" });
    });
  }

  /**
   *
   */
  async _submit() {
    if (this._pending) return;
    const data = this.getData(_a.formItem) || {};
    const name = String(data.name || "").trim();
    if (!name) return this._error(LOCALE.REQUIRE_THIS_FIELD);

    this._pending = 1;
    const res = await this.postService(SERVICE.organization.department_add, {
      hub_id: Visitor.id,
      name,
    }).catch(() => null);
    this._pending = 0;

    // The server reports a refusal as a status code (DEPARTMENT_EXISTS,
    // NOT_ENOUGH_PRIVILEGE, ...), each with a locale key of the same name.
    // Shown in place, under the field the user is still typing in, rather
    // than in an alert that would take the dialog's focus away.
    if (!res || res.status) {
      const key = res && res.status;
      return this._error((key && LOCALE[key]) || LOCALE.SOMETHING_WENT_WRONG);
    }

    invalidateOverview();
    invalidateDepartments();
    // Two listeners, two channels: the org chip re-reads its counts on
    // org:refresh, and the org view / department crumb repaint on
    // department:changed. The org view TRIGGERS org:refresh itself after every
    // reload, so it must not also listen to it.
    RADIO_BROADCAST.trigger("org:refresh");
    RADIO_BROADCAST.trigger("department:changed", { created: res });
    return this._close();
  }

  /**
   * @param {View} cmd
   * @param {Object} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || (cmd.get && cmd.get(_a.service));
    switch (service) {
      case _e.close:
        return this._close();

      case "create-department":
        return this._submit();

      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __desk_department_form;
