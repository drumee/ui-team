/* ==================================================================== *
 * desk_org_tab
 * The topbar organisation chip and its dropdown — Figma 104:33055.
 *
 * The chip itself needs no server: Organization and the billing plan are
 * both bootstrap-frozen. The dropdown's counts do, so the panel is fed once
 * the overview resolves rather than built with the rest of the tree.
 * ==================================================================== */
const { orgOverview, invalidate } = require("libs/org-overview");

class __desk_org_tab extends LetcBox {

  /**
   *
   */
  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    this._onOrgChange = this._onOrgChange.bind(this);
    Organization.on(_e.change, this._onOrgChange);
    // The org view creates and deletes departments; the chip's counts are the
    // same numbers. One broadcast keeps them honest without either widget
    // knowing the other exists.
    RADIO_BROADCAST.on("org:refresh", this._refresh, this);
  }

  /**
   *
   */
  onBeforeDestroy() {
    Organization.off(_e.change, this._onOrgChange);
    RADIO_BROADCAST.off("org:refresh", this._refresh, this);
  }

  /**
   *
   */
  onDomRefresh() {
    this.feed(require("./skeleton")(this));
  }

  /**
   * The chip reads Organization directly, so a name change has to redraw the
   * whole control — trigger included. The panel is refed from cache on the way
   * back so an open dropdown does not blank.
   */
  _onOrgChange() {
    if (this.isDestroyed && this.isDestroyed()) return;
    this.feed(require("./skeleton")(this));
  }

  /**
   * Re-read the overview and repaint the panel.
   *
   * Only the PANEL: the chip shows the name and the plan, neither of which the
   * overview can change, so redrawing the trigger would collapse an open menu
   * for nothing.
   */
  _refresh() {
    invalidate();
    return this._feedPanel(1);
  }

  /**
   * @param {Boolean} [force] bypass the shared cache
   */
  _feedPanel(force) {
    return this.ensurePart("org-panel").then((part) =>
      orgOverview(this, force).then((data) => {
        if (!part || (part.isDestroyed && part.isDestroyed())) return;
        this._data = data;
        part.feed(require("./skeleton").panel(this.fig.family, this, data));
      }),
    );
  }

  /**
   *
   */
  onPartReady(child, pn) {
    if (pn === "org-panel") return this._feedPanel();
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  /**
   * Swap the org name for an entry, in place.
   *
   * Inline rather than a modal because the frame puts the pencil ON the name:
   * a dialog for a single field the user is already looking at is a longer
   * road to the same edit. `removeOnEscape` and the commit service are what
   * close it — there is no cancel button in the frame either.
   */
  _renameOrganization() {
    const pfx = this.fig.family;
    const current = (this._data && this._data.organisation && this._data.organisation.name)
      || Organization.name()
      || "";
    return this.ensurePart("org-name-row").then((row) => {
      if (!row) return;
      row.feed(
        Skeletons.Entry({
          className: `${pfx}__rename-entry`,
          sys_pn: "rename-entry",
          value: current,
          mode: _a.commit,
          // `any` rather than no rule at all: Entry.commit() runs
          // checkSanity() before it dispatches, and an entry with no declared
          // requirement takes the validator's default path. An org name has no
          // shape to enforce beyond being present, which the handler checks.
          require: "any",
          service: "commit-organization-name",
          preselect: 1,
          removeOnEscape: true,
          uiHandler: [this],
        }),
      );
    });
  }

  /**
   * Commit the rename.
   *
   * Reads the value off the committing widget rather than through getData():
   * the entry is fed into a part after render, so it is not in the form-item
   * tree the collector walks.
   *
   * Organization.set is what redraws the chip — every other surface that shows
   * the org name (the tour chip, the sidebar) listens to the same model, so
   * writing it here updates all of them without this widget knowing about any.
   */
  async _commitOrganizationName(cmd) {
    const name = String((cmd && cmd.getValue && cmd.getValue()) || "").trim();
    if (!name) return this._feedPanel();
    const res = await this.postService(SERVICE.organization.rename, {
      hub_id: Visitor.id,
      name,
    }).catch(() => null);
    if (!res || res.status) {
      if (Wm && Wm.alert) Wm.alert(LOCALE[res && res.status] || LOCALE.SOMETHING_WENT_WRONG);
      return this._feedPanel();
    }
    Organization.set(_a.name, name);
    return this._refresh();
  }

  /**
   * @param {View} cmd
   * @param {Object} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || (cmd.get && cmd.get(_a.service));
    switch (service) {
      case "rename-organization":
        return this._renameOrganization();

      case "commit-organization-name":
        return this._commitOrganizationName(cmd);

      // Both are the DESK's screens, not this widget's — it owns the panel,
      // not what opening one does. triggerHandlers walks up to the desk, which
      // is where every other section screen is opened from.
      case "open-org-view":
      case "manage-organization":
        return this.triggerHandlers({ service });

      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __desk_org_tab;
