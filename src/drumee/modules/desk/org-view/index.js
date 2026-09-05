/* ==================================================================== *
 * desk_org_view
 * The organisation screen behind the org dropdown's "Open" — Figma 104:33055.
 *
 * A full-canvas section screen, mounted by the desk in the same slot as
 * Settings / Get help / Calendar, so it inherits their mutual exclusion and
 * their destroy-on-close.
 * ==================================================================== */
const { orgOverview, groupByDepartment, EMPTY } = require("libs/org-overview");
const { workspaceTarget } = require("libs/workspace-target");

/**
 * How long a department stays armed for the workspace being created into it.
 * See _armPendingDept for why this has a deadline at all.
 */
const PENDING_DEPT_TTL = 120000;

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
      orgOverview(this, force).then((data) => {
        if (!part || (part.isDestroyed && part.isDestroyed())) return;
        this._data = data;
        this._rows.clear();
        for (const w of data.workspaces) this._rows.set(String(w.hub_id), w);
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
      ),
    );
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
      workspaces: this._data.workspaces.filter((w) =>
        String(w.filename || w.name || "").toLowerCase().includes(q),
      ),
    };
  }

  /**
   * Arm the inline "New department" entry and focus it.
   *
   * Inline rather than a modal so the topbar's "New department" row and this
   * screen's "+ New" both land in the same place — one way to name a
   * department however the user started.
   */
  armNewDepartment() {
    const pfx = this.fig.family;
    // An ordinary member can REACH this — the topbar's "New department" row is
    // gated on orgFeature(), which cannot know can_manage because the answer
    // needs a round trip the topbar renders before. So the gate lands here,
    // where the overview has resolved. Without it the row armed an entry that
    // the server refused on submit: an action offered and then withdrawn.
    //
    // Says why, rather than no-op'ing. An input that simply refuses to appear
    // reads as a broken button.
    if (this._data && !this._data.can_manage) {
      if (Wm && Wm.alert) Wm.alert(LOCALE.NOT_ENOUGH_PRIVILEGE);
      return Promise.resolve();
    }
    return this.ensurePart("new-dept").then((part) => {
      if (!part) return;
      part.feed(
        Skeletons.Entry({
          className: `${pfx}__new-dept-entry`,
          sys_pn: "new-dept-entry",
          placeholder: LOCALE.DEPARTMENT_NAME,
          mode: _a.commit,
          service: "commit-new-department",
          require: "any",
          // preselect, not autofocus — Entry has no `autofocus` prop at all
          // (Messenger does, which is where the name comes from). preselect
          // calls select() on the input once it is ready, which focuses it;
          // on an empty field that is exactly a focus.
          preselect: 1,
          removeOnEscape: true,
          uiHandler: [this],
        }),
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
   * @param {View} cmd the committing entry
   */
  async _createDepartment(cmd) {
    const name = String((cmd && cmd.getValue && cmd.getValue()) || "").trim();
    if (!name) return this._render();
    const res = await this.postService(SERVICE.organization.department_add, {
      hub_id: Visitor.id,
      name,
    }).catch(() => null);
    if (this._complained(res)) return this._render();
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
   * Through workspaceTarget, never the raw row: that helper owns the rules for
   * turning a listing row into what loadWorkspace wants, and the desk's home
   * grid and the topbar switcher already resolve the same rows through it. The
   * org_workspaces payload carries desk.home column names precisely so this
   * could be the same call.
   *
   * @param {View} cmd
   */
  _openWorkspace(cmd) {
    const row = this._rows.get(String(cmd.mget("wsHubId")));
    if (!row || typeof Wm === "undefined") return;
    return Wm.loadWorkspace(workspaceTarget(row));
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

      case "commit-new-department":
        return this._createDepartment(cmd);

      case "rename-department":
        return this._renameDepartment(cmd.mget("deptId"));

      case "commit-department-name":
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
