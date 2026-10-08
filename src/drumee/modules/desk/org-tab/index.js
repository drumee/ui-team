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
    this._orgs = null;
    return this._feedPanel(1);
  }

  /**
   * @param {Boolean} [force] bypass the shared cache
   */
  /**
   * Your organization / Invited Organizations (multi-org). Also learns the
   * shown organisation's plan for the chip.
   */
  _feedOrgs() {
    if (!require("./multi-org").multiOrgEnabled()) return Promise.resolve();
    const fetch = this._orgs
      ? Promise.resolve(this._orgs)
      : this.fetchService(SERVICE.organization.my_orgs, { hub_id: Visitor.id })
        .then((data) => (this._orgs = data || { orgs: [] }))
        .catch(() => null);
    return fetch.then((data) => {
      if (!data || (this.isDestroyed && this.isDestroyed())) return;
      // The chip shows the person's own plan until this answers; on another
      // organisation, redraw it with that organisation's plan (once: the
      // redraw re-enters here with the same plan and stops).
      const cur = (data.orgs || []).find((o) => o.current);
      const { planKey } = require("libs/billing");
      if (cur && cur.plan && cur.plan !== this._currentPlan) {
        this._currentPlan = cur.plan;
        if (planKey(cur.plan) !== planKey()) return this.feed(require("./skeleton")(this));
      }
      return this.ensurePart("switch-list").then((part) => {
        if (!part || (part.isDestroyed && part.isDestroyed())) return;
        part.feed(require("./skeleton").orgSections(this.fig.family, this, data));
      });
    });
  }

  /**
   * Go to another organisation: it is its own address, and the server acts
   * there for its members (service/lib/active-org.js). The endpoint path is
   * kept; the hash is not (a workspace of one org means nothing in another).
   */
  _switchOrganization(link) {
    if (!link || link === location.hostname) return;
    this._closeMenu();
    location.href = `${location.protocol}//${link}${location.pathname}`;
  }

  _entryValue(pn) {
    const p = this.getPart(pn);
    return String((p && p.getValue && p.getValue()) || "").trim();
  }

  /**
   * "+ New organization" (Business plan): create it, then open it.
   */
  async _createOrganization() {
    if (this._newOrgBusy) return;
    const name = this._entryValue("new-org-name");
    const ident = this._entryValue("new-org-ident").toLowerCase();
    // Kept so a repaint (error, busy) gives the fields back as typed.
    this._newOrgName = name;
    this._newOrgIdent = ident;
    const say = (k, f) => (LOCALE[k] && LOCALE[k] !== k ? LOCALE[k] : f);
    if (!name) this._newOrgError = say("ORG_NAME_REQUIRED", "Give your organization a name.");
    else if (!/^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$/.test(ident)) {
      this._newOrgError = say("INVALID_IDENT", "Use 2 to 40 lowercase letters, numbers or dashes (not at the start or end).");
    } else this._newOrgError = "";
    if (this._newOrgError) return this._feedOrgs();
    this._newOrgBusy = true;
    this._feedOrgs();
    const res = await this.postService(SERVICE.organization.create_org, { hub_id: Visitor.id, name, ident })
      .catch(() => null);
    this._newOrgBusy = false;
    if (!res || res.status || !res.link) {
      const st = res && res.status;
      this._newOrgError = {
        IDENT_NOT_AVAILABLE: say("IDENT_NOT_AVAILABLE", "This address is already taken. Please pick another one."),
        IDENT_RESERVED: say("IDENT_RESERVED", "This address is reserved. Please pick another one."),
        PLAN_UPGRADE_REQUIRED: say("MULTI_ORG_UPSELL_LINK", "Business plan supports that →"),
      }[st] || say("SOMETHING_WENT_WRONG", "Something went wrong. Please try again.");
      return this._feedOrgs();
    }
    this._switchOrganization(res.link);
  }

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
    if (pn === "switch-list") return this._feedOrgs();
    // The Menu widget ITSELF, not a box holding one: the skeleton puts
    // `sys_pn` on the Skeletons.Menu descriptor, so this part is the menu.
    // Kept because "Open" has to close it — see _closeMenu.
    if (pn === "org-menu") this._menu = child;
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  /**
   * Shut the dropdown.
   *
   * IT DOES NOT SHUT ITSELF. `persistence: _a.always` (see the skeleton) is
   * what stops a click inside the panel from closing it, and that is there for
   * the inline rename — an entry the user is typing in must not be yanked out
   * from under them. "Open" is the one row where that protection is wrong: it
   * navigates away, so the panel was left hanging over the screen it had just
   * opened, to be dismissed by hand.
   *
   * _triggerToggle, not _closeItems: it is the entry the desk's own switcher
   * close goes through (Desk._toggleWorkspaceSwitcher) and it reads the menu's
   * `state`, so a panel that is already shut is left alone rather than animated
   * closed a second time.
   *
   * NB menu_topic carries a `brake` latch that makes _closeItems refuse
   * outright. Only its `_close()` sets it, and nothing in this ui-core calls
   * `_close()` — verified dead code there at the time of writing. A ui-core
   * upgrade that wires it up would show as a panel which silently stops
   * closing, and this is the first place to look.
   */
  _closeMenu() {
    const menu = this._menu;
    if (!menu || !menu.el || (menu.isDestroyed && menu.isDestroyed())) return;
    if (_.isFunction(menu._triggerToggle)) menu._triggerToggle();
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

      // The DESK's screen, not this widget's — it owns the panel, not what
      // opening one does. triggerHandlers walks up to the desk, which is where
      // every other section screen is opened from.
      case "switch-organization":
        return this._switchOrganization(cmd.mget("link"));

      case "new-organization":
        this._creatingOrg = true;
        this._newOrgError = "";
        return this._feedOrgs();

      case "new-organization-cancel":
        this._creatingOrg = false;
        this._newOrgError = "";
        return this._feedOrgs();

      case "new-organization-create":
        return this._createOrganization();

      case "upgrade-for-orgs":
        this._closeMenu();
        return RADIO_BROADCAST.trigger("desk:open-billing-page", { intent: "upgrade" });

      case "open-org-view":
        // CLOSED FIRST, and only for this row — see _closeMenu. Before the
        // raise, so the panel is on its way out as the screen mounts rather
        // than blinking away after it; neither call awaits the other.
        this._closeMenu();
        return this.triggerHandlers({ service });

      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __desk_org_tab;
