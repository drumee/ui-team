/* ==================================================================== *
 * desk_org_view
 * The organisation screen behind the org dropdown's "Open" — Figma 104:33055.
 *
 * A full-canvas section screen, mounted by the desk in the same slot as
 * Settings / Get help / Calendar, so it inherits their mutual exclusion and
 * their destroy-on-close.
 * ==================================================================== */
const { orgOverview, groupByDepartment, EMPTY } = require("libs/org-overview");

/**
 * How long a department stays armed for the workspace being created into it.
 * See _armPendingDept for why this has a deadline at all.
 */
const PENDING_DEPT_TTL = 120000;

/**
 * Does a workspace's name match the search box? One rule for the
 * organisation's workspaces and the personal ones.
 *
 * @param {Object} w a workspace row
 * @param {String} q the lowercased query
 */
function matchesQuery(w, q) {
  return String(w.filename || w.name || "").toLowerCase().includes(q);
}

class __desk_org_view extends LetcBox {

  /**
   *
   */
  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    // hub_id -> the org_workspaces row. Cards carry only the key: spreading a
    // server row onto a skeleton collides with the props the renderer reads
    // (name / id / area / filetype all mean something to Skeletons).
    this._rows = new Map();
    // The caller's PERSONAL workspaces, nid -> the desk.home row. Keyed by
    // nid, not hub_id: every personal workspace carries the user's own hub_id
    // (see Desk._workspaceKey).
    this._personal = [];
    this._personalRows = new Map();
    this._filter = "";
    // Arriving with the intent already set means the desk mounted this screen
    // FOR the topbar's "New department" row. Read here rather than at paint
    // time so it survives exactly one render and cannot re-arm on a later
    // repaint (a search keystroke, say).
    this._armPending = !!this.mget("armNewDepartment");
    RADIO_BROADCAST.on("workspace:refresh", this._reload, this);
    // The other half of the same intent: the topbar raised it while this
    // screen was ALREADY the one on canvas, so there was no mount to carry it.
    RADIO_BROADCAST.on("org:new-department", this.armNewDepartment, this);
  }

  /**
   *
   */
  onBeforeDestroy() {
    // The dialog lives in the desk's modal host, not under this view, so it
    // would outlive the screen that answers its buttons.
    this._closeDeptDialog();
    RADIO_BROADCAST.off("workspace:refresh", this._reload, this);
    RADIO_BROADCAST.off("org:new-department", this.armNewDepartment, this);
  }

  /**
   *
   */
  onDomRefresh() {
    this.feed(require("./skeleton")(this));
  }

  /**
   *
   */
  onPartReady(child, pn) {
    if (pn === "sections") return this._render();
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  /**
   * Re-read from the server, then repaint.
   *
   * Also tells the chip: its department and member counts are the same numbers
   * this screen just changed, and the broadcast is how they stay equal without
   * either widget knowing the other exists.
   *
   * Doubles as the `workspace:refresh` listener, which is how a workspace
   * created from a department's "+ New workspace" lands IN that department.
   * The creation itself is the desk's existing flow (libs/create-workspace,
   * which announces on this same channel) — reimplementing it here to pass a
   * department through would have duplicated its quota handling, its tracking
   * and its filename rules. Instead the department is remembered across the
   * dialog and applied to whatever came back.
   *
   * @param {Object} [payload] a workspace:refresh payload
   */
  _reload(payload) {
    const pending = this._takePendingDept();
    const created = payload && payload.workspace;
    // A PERSONAL workspace is a home-root folder, not a hub — it has no row in
    // yp.hub and therefore no department_id to set. Skipping it is not a
    // limitation to work around: personal workspaces are outside the
    // organisation's inventory by construction.
    if (pending && created && created.hub_id && !payload.personal) {
      return this.postService(SERVICE.organization.department_assign, {
        hub_id: Visitor.id,
        // The workspace being MOVED travels as `nid`, not hub_id: hub_id
        // addresses the caller's own hub and is what the ACL reads for scope.
        // Same split as desk.leave_hub.
        nid: created.hub_id,
        department_id: pending,
      })
        .catch(() => null)
        .then(() => {
          RADIO_BROADCAST.trigger("org:refresh");
          return this._render(1);
        });
    }
    RADIO_BROADCAST.trigger("org:refresh");
    return this._render(1);
  }

  /**
   * @param {Boolean} [force] bypass the shared cache
   */
  _render(force) {
    return this.ensurePart("sections").then((part) =>
      Promise.all([orgOverview(this, force), this._personalWorkspaces(force)]).then(([data, personal]) => {
        if (!part || (part.isDestroyed && part.isDestroyed())) return;
        this._data = data;
        this._rows.clear();
        for (const w of data.workspaces) this._rows.set(String(w.hub_id), w);
        this._personal = personal;
        this._personalRows.clear();
        for (const w of personal) this._personalRows.set(String(w.nid || w.id), w);
        this._paint(part);
        // Only after the first paint: the entry is fed into a part that
        // _paint creates, so arming before it exists would resolve against
        // nothing.
        if (this._armPending) {
          this._armPending = false;
          return this.armNewDepartment();
        }
      }),
    );
  }

  /**
   * The caller's personal workspaces.
   *
   * NOT IN THE OVERVIEW, by construction: a personal workspace is a home-root
   * folder, not a hub, so it has no row in yp.hub for org_workspaces to list
   * (see _reload). The desk's own workspace list — the switcher's, which files
   * them under "Personal" — already holds them, so they come from there
   * rather than from a second desk.home read.
   *
   * Never rejects: an unreachable list leaves the section out, it does not
   * take the organisation's workspaces down with it.
   *
   * @param {Boolean} [force] refetch instead of the cached list
   * @returns {Promise<Array>} desk.home folder rows
   */
  _personalWorkspaces(force) {
    const desk = window.Desk;
    if (!desk || !_.isFunction(desk._fetchWorkspaces)) return Promise.resolve([]);
    // A failed fetch answers [] and leaves the desk's cache untouched, so an
    // empty answer falls back to that cache rather than dropping the section.
    const cached = () => desk._workspaces || [];
    return Promise.resolve()
      .then(() => desk._fetchWorkspaces(force))
      .then((rows) => (rows && rows.length ? rows : cached()))
      .catch(cached)
      .then((rows) => rows.filter((r) => r && r.filetype === _a.folder));
  }

  /**
   * Draw the sections from what is already in hand.
   *
   * Separate from _render so the search filter can repaint without a round
   * trip — overview returns the whole organisation in one read, so filtering
   * is a client concern.
   *
   * @param {Object} part the "sections" part
   */
  _paint(part) {
    const data = this._filtered();
    // A viewer below admin is sent no departments and no workspaces — those
    // lists carry the names of workspaces they cannot open. Say so, rather
    // than let the empty payload fall through to "No departments yet", which
    // would blame the organisation for a permission boundary.
    //
    // The chip does not offer "Open" to them at all, so this is the backstop
    // for any other way in (a restored panel, a stale broadcast), not the
    // expected path.
    if (data && data.organisation && !data.can_browse) {
      return part.feed(
        Skeletons.Note({
          className: `${this.fig.family}__empty`,
          content: LOCALE.NOT_ENOUGH_PRIVILEGE,
        }),
      );
    }
    part.feed(
      require("./skeleton").sections(
        this.fig.family,
        this,
        groupByDepartment(data),
        !!data.can_manage,
        // null, not [], when the user has none at all: the section is then
        // left out rather than drawn empty. A search that matches none of them
        // keeps the header, like a department's.
        this._personal.length ? this._filteredPersonal() : null,
      ),
    );
  }

  /** The personal workspaces, narrowed to the search box like the rest. */
  _filteredPersonal() {
    const q = this._filter.trim().toLowerCase();
    if (!q) return this._personal;
    return this._personal.filter((w) => matchesQuery(w, q));
  }

  /**
   * The overview, narrowed to workspaces matching the search box.
   *
   * DEPARTMENTS ARE NOT FILTERED OUT, only their contents: a search that made
   * empty sections disappear would keep re-flowing the page as the user types,
   * and the section headers are the map the user is reading the results
   * against. An empty query returns the payload untouched.
   */
  _filtered() {
    const q = this._filter.trim().toLowerCase();
    // EMPTY from the lib, not an inline literal: the payload has grown twice
    // now (role, can_browse), and a hand-written fallback here silently stops
    // matching it — which is how a guard keyed on a field the fallback lacks
    // starts reading as false.
    if (!q || !this._data) return this._data || { ...EMPTY };
    return {
      ...this._data,
      workspaces: this._data.workspaces.filter((w) => matchesQuery(w, q)),
    };
  }

  /**
   * Open the "Create department" dialog, centred over the desk.
   *
   * A modal, not the inline entry this used to feed at the foot of the
   * sections: below every workspace, that entry sat off-screen on any
   * organisation with more than a screenful of them, so "New department"
   * appeared to do nothing until the user scrolled to find it. The topbar's
   * "New department" row and this screen's "+ New" both land here.
   *
   * Hosted by Wm.__wrapperModal, the desk's shared centring host — the same
   * one Wm.confirm and the create-workspace form use — so it is centred on the
   * viewport whatever this screen's scroll position.
   */
  armNewDepartment() {
    // An ordinary member can REACH this — the topbar's "New department" row is
    // gated on orgFeature(), which cannot know can_manage because the answer
    // needs a round trip the topbar renders before. So the gate lands here,
    // where the overview has resolved. Without it the row opened a form that
    // the server refused on submit: an action offered and then withdrawn.
    //
    // Says why, rather than no-op'ing. A dialog that simply refuses to appear
    // reads as a broken button.
    if (this._data && !this._data.can_manage) {
      if (Wm && Wm.alert) Wm.alert(LOCALE.NOT_ENOUGH_PRIVILEGE);
      return Promise.resolve();
    }
    const host = Wm && Wm.__wrapperModal;
    if (!host || !_.isFunction(host.feed)) return Promise.resolve();
    this._deptHost = host;
    host.feed(require("./skeleton/dept-dialog")(this));
    // The host is only SIZED and centring while [data-state="open"]; feed()
    // alone does not set it (see Wm.confirm). The wrapper clears it again
    // when it empties. data-overlay it does NOT clear — _closeDeptDialog does,
    // because the host is shared and a scrim left behind would dim the next
    // dialog that never asked for one.
    if (host.el) {
      host.el.dataset.state = _a.open;
      host.el.dataset.overlay = "scrim";
    }
    this._armDeptEscape();
    return this.ensurePart("dept-dialog-name").then((entry) =>
      // Deferred: ensurePart resolves when the Entry mounts, before its native
      // <input> can take focus — the create-folder dialog's same delay.
      _.delay(() => {
        const input = entry && entry.el && entry.el.querySelector("input");
        if (input) input.focus();
      }, 60),
    );
  }

  /**
   * Escape closes the dialog wherever focus is. The Entry reports its own
   * Escape (__inputStatus "cancel"), but only while the input has focus; a
   * click on the card's padding takes it away.
   */
  _armDeptEscape() {
    this._dropDeptEscape();
    this._deptEscape = (e) => {
      if (e.key === "Escape") this._closeDeptDialog();
    };
    document.addEventListener("keyup", this._deptEscape);
  }

  _dropDeptEscape() {
    if (!this._deptEscape) return;
    document.removeEventListener("keyup", this._deptEscape);
    this._deptEscape = null;
  }

  /**
   * Empty the modal host — but only if it still holds OUR card. Another
   * dialog may have replaced it in the meantime (a confirm, the invite
   * popup), and clearing then would close someone else's.
   */
  _closeDeptDialog() {
    this._dropDeptEscape();
    const host = this._deptHost;
    this._deptHost = null;
    if (!host || !host.el || (host.isDestroyed && host.isDestroyed())) return;
    if (!host.el.querySelector(`.${this.fig.family}__dept-dialog`)) return;
    host.el.dataset.overlay = "";
    host.clear();
  }

  /**
   * Show a refusal inside the dialog, under the field.
   *
   * @param {String} [text] nothing clears it
   */
  _deptDialogError(text) {
    return this.ensurePart("dept-dialog-error").then((part) => {
      if (!part || (part.isDestroyed && part.isDestroyed())) return;
      part.feed(
        text
          ? Skeletons.Note({
              className: `${this.fig.family}__dept-dialog-error-text`,
              content: text,
            })
          : [],
      );
    });
  }

  /**
   * Remember which department the workspace about to be created belongs in.
   *
   * STAMPED WITH A DEADLINE, because the create dialog can be CANCELLED and a
   * cancel announces nothing. Without an expiry the intent simply waited: the
   * user backed out of "+ New workspace" on Engineering, created an unrelated
   * workspace from the sidebar ten minutes later, and that one silently landed
   * in Engineering. There is no UI to move a workspace back out of a
   * department, so a wrong assignment is not a small thing to undo.
   *
   * Two minutes is the whole span of "the dialog is open and I am typing a
   * name" with room to spare, and far short of "I did something else".
   *
   * @param {String} id department id
   */
  _armPendingDept(id) {
    this._pendingDept = id
      ? { id, until: Date.now() + PENDING_DEPT_TTL }
      : null;
  }

  /**
   * Consume the pending department — single-shot, and only while fresh.
   *
   * Cleared on EVERY call, including an expired one: a stale intent that has
   * been looked at once has already failed to be used for the creation it was
   * armed for.
   *
   * @returns {String|null}
   */
  _takePendingDept() {
    const p = this._pendingDept;
    this._pendingDept = null;
    if (!p || Date.now() > p.until) return null;
    return p.id;
  }

  /**
   * Report a refusal the server named.
   *
   * The server answers a refusal as a status code (DEPARTMENT_EXISTS, …), each
   * of which has a locale key of the same name. Falling back to the generic
   * message rather than printing the raw code keeps an unmapped status from
   * showing the user an identifier.
   *
   * @param {Object} res
   * @returns {Boolean} true when a refusal was reported
   */
  _complained(res) {
    if (!res || res.status) {
      const key = res && res.status;
      if (Wm && Wm.alert) Wm.alert((key && LOCALE[key]) || LOCALE.SOMETHING_WENT_WRONG);
      return true;
    }
    return false;
  }

  /**
   * Submit the dialog — from Enter in its field or from its Create button.
   *
   * Read from the field either way: the button carries no value of its own.
   */
  async _createDepartment() {
    const entry = this.getPart("dept-dialog-name");
    const name = String((entry && entry.getValue && entry.getValue()) || "").trim();
    if (!name) {
      this._deptDialogError(LOCALE.DEPARTMENT_NAME_REQUIRED);
      return;
    }
    // One request at a time. Entry re-arms on every keyup, so a second Enter
    // (or Enter then a click on Create) while the first is still in flight is
    // a second department_add — which lands after the first has inserted and
    // answers DEPARTMENT_EXISTS for a department that was in fact created.
    if (this._addingDept) return;
    this._addingDept = true;
    let res;
    try {
      res = await this.postService(SERVICE.organization.department_add, {
        hub_id: Visitor.id,
        name,
      }).catch(() => null);
    } finally {
      this._addingDept = false;
    }
    // A refusal keeps the dialog open with the name still typed, so the user
    // can correct it rather than start over.
    if (!res || res.status) {
      const key = res && res.status;
      this._deptDialogError((key && LOCALE[key]) || LOCALE.SOMETHING_WENT_WRONG);
      return;
    }
    this._closeDeptDialog();
    return this._reload();
  }

  /**
   * Swap a section's title for an entry, in place — same interaction as the
   * org name's pencil in the dropdown.
   *
   * @param {String} id department id
   */
  _renameDepartment(id) {
    const pfx = this.fig.family;
    const section = (this._data.departments || []).find((d) => String(d.id) === String(id));
    if (!section) return;
    return this.ensurePart(`dept-head:${id}`).then((part) => {
      if (!part) return;
      part.feed(
        Skeletons.Entry({
          className: `${pfx}__section-rename-entry`,
          value: section.name,
          mode: _a.commit,
          service: "commit-department-name",
          deptId: id,
          require: "any",
          preselect: 1,
          removeOnEscape: true,
          uiHandler: [this],
        }),
      );
    });
  }

  /**
   * @param {View} cmd the committing entry — carries deptId
   */
  async _commitDepartmentName(cmd) {
    const id = cmd.mget("deptId");
    const name = String((cmd.getValue && cmd.getValue()) || "").trim();
    if (!id || !name) return this._render();
    const res = await this.postService(SERVICE.organization.department_rename, {
      hub_id: Visitor.id,
      department_id: id,
      name,
    }).catch(() => null);
    if (this._complained(res)) return this._render();
    return this._reload();
  }

  /**
   * Delete a department. Its workspaces survive and become ungrouped, which is
   * what the confirmation says — a delete that silently took workspaces with
   * it would be the one thing a user could not undo here.
   *
   * @param {String} id
   */
  _deleteDepartment(id) {
    if (!id || typeof Wm === "undefined" || !_.isFunction(Wm.confirm)) return;
    // Wm.confirm, not window.confirm: the shared window_confirm dialog is what
    // every other destructive action in this app asks through, and it resolves
    // on confirm / REJECTS on cancel. A cancel is not an error, so the catch
    // swallows it rather than reporting one.
    //
    // Not `confirm_type: "danger"` either: nothing is destroyed here. The
    // workspaces survive and become ungrouped, which is what the message says,
    // and dressing that as a danger action would misreport it.
    return Wm.confirm({
      message: () =>
        Skeletons.Note({ content: LOCALE.DELETE_DEPARTMENT_CONFIRM }),
      confirm: LOCALE.DELETE,
      cancel: LOCALE.CANCEL,
    })
      .then(async () => {
        const res = await this.postService(SERVICE.organization.department_remove, {
          hub_id: Visitor.id,
          department_id: id,
        }).catch(() => null);
        if (this._complained(res)) return;
        return this._reload();
      })
      .catch(() => {});
  }

  /**
   * Open a workspace card.
   *
   * THE DESK'S GESTURE, NOT THIS SCREEN'S. A card is a switcher row drawn
   * somewhere else, so it goes where a switcher row goes — up to the desk,
   * which owns everything that has to happen AROUND the open: the rail reset
   * (only on a real change of workspace), the switcher's label and its
   * `data-current` mark, and handing over any tour painted on the pane being
   * replaced. See Desk._switchWorkspaceRow.
   *
   * This used to call `Wm.loadWorkspace(workspaceTarget(row))` itself. That
   * opens the pane and closes this screen over it, so it LOOKED complete —
   * what it left behind was a rail lit on the previous workspace's tab and a
   * switcher still naming the workspace the user just left.
   *
   * The ROW goes up, not the hub_id: the desk resolves identity with its own
   * `_workspaceKey`, and a widget that spelled that rule itself would be a
   * second definition of it. `_rows` holds the row because the card carries
   * only the key — spreading a server row onto a skeleton collides with the
   * props the renderer reads (see the skeleton's `card`).
   *
   * @param {View} cmd
   */
  _openWorkspace(cmd) {
    // A personal card carries its nid instead — see _personalRows.
    const nid = cmd.mget("wsNid");
    const row = nid != null
      ? this._personalRows.get(String(nid))
      : this._rows.get(String(cmd.mget("wsHubId")));
    if (!row) return;
    return this.triggerHandlers({ service: "switch-workspace-row", row });
  }

  /**
   * @param {View} cmd
   * @param {Object} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || (cmd.get && cmd.get(_a.service));
    switch (service) {
      case "filter-workspaces":
        this._filter = String(args.value == null ? "" : args.value);
        // ensurePart resolves immediately once the part is mounted, and the
        // filter only ever runs after the first paint — so this is a
        // microtask, not a round trip. The repaint is local: _paint re-reads
        // the payload already in hand and never re-fetches.
        return this.ensurePart("sections").then((p) => p && this._paint(p));

      case "new-department":
        return this.armNewDepartment();

      // ONLY an Enter commits. ui-core's Entry raises its `service` on three
      // more gestures: Escape (__inputStatus "cancel"), and the click that
      // focuses the input (letc's el.onclick — no __inputStatus at all). With
      // no guard, a click into the field after typing POSTed the name, and
      // the Enter that followed POSTed it again: the department was created
      // and then reported as "already exists". Escape created it too.
      case "commit-new-department":
        // _e.cancel / _a.commit: the exact constants the Entry stamps. The
        // truthiness check matters — a click carries NO status, and must never
        // read as a cancel.
        if (args.__inputStatus && args.__inputStatus === _e.cancel) {
          return this._closeDeptDialog();
        }
        if (args.__inputStatus !== _a.commit) return;
        return this._createDepartment();

      case "submit-new-department":
        return this._createDepartment();

      case "close-department-dialog":
        return this._closeDeptDialog();

      case "rename-department":
        return this._renameDepartment(cmd.mget("deptId"));

      case "commit-department-name":
        // Escape: the entry removes itself (removeOnEscape), which would leave
        // the section without a title — repaint it from the cached overview.
        // It used to fall through to a rename with the unchanged name, whose
        // _reload is what repainted.
        if (args.__inputStatus && args.__inputStatus === _e.cancel) {
          return this._render();
        }
        if (args.__inputStatus !== _a.commit) return;
        return this._commitDepartmentName(cmd);

      case "delete-department":
        return this._deleteDepartment(cmd.mget("deptId"));

      case "open-workspace":
        return this._openWorkspace(cmd);

      // A section's "+ New workspace" is the desk's ordinary create flow with
      // a department remembered across it — see _reload, which applies it to
      // whatever the flow announces. The service raised upward is the plain
      // one, so the desk needs to know nothing about departments.
      case "new-workspace-in-department":
        this._armPendingDept(cmd.mget("deptId"));
        return this.triggerHandlers({ service: "new-workspace-form" });

      // The desk owns both of these already — the topbar's "+ New" raises the
      // same two services. Delegating rather than reimplementing keeps the
      // over-limit guard and the gdrive popup in one place.
      case "new-workspace-form":
      case "launch-gdrive-migration":
        return this.triggerHandlers({ service });

      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

module.exports = __desk_org_view;
