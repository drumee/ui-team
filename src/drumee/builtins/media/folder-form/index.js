/* "Create new folder" modal. Shown by the desk topbar's + Add new
 * button when the user is inside a workspace. The folder lands in the
 * resolved hub_id+nid context. */

class __folder_form extends LetcBox {

  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
  }

  onDomRefresh() {
    this.feed(require('./skeleton')(this));
  }

  onUiEvent(trigger, args = {}) {
    const service = args.service || trigger.get(_a.service);
    switch (service) {
      case _e.close:
        if (this.parent && _.isFunction(this.parent.clear)) {
          return this.parent.clear();
        }
        return this.goodbye();

      case "create-folder":
        return this._submit();

      default:
        if (super.onUiEvent) super.onUiEvent(trigger, args);
    }
  }

  // Resolve the target hub_id/nid. The launcher's hub_id wins when set
  // (the topbar passes Wm._curWorkspace.hub_id even before the workspace
  // root nid has finished resolving). For the nid we accept the launcher
  // value, then Wm._curWorkspace.nid (filled in async by loadWorkspace),
  // then the active window's current location. Only fall through to the
  // active window if no workspace context exists at all (home view).
  _resolveContext() {
    const cur = Wm._curWorkspace || {};
    const hubFromOpt = this.mget(_a.hub_id);
    const nidFromOpt = this.mget(_a.nid);

    const hub_id = hubFromOpt || cur.hub_id;
    if (hub_id) {
      const nid = nidFromOpt || cur.nid;
      if (nid) return { hub_id, nid };
      // Have hub but no nid yet — fetch the root.
      return { hub_id, nid: null };
    }

    const target = Wm.getActiveWindow(1);
    if (target) {
      const h = target.mget && target.mget(_a.hub_id);
      const n = target.getCurrentNid && target.getCurrentNid();
      if (h && n) return { hub_id: h, nid: n };
    }

    return null;
  }

  // Last-resort fetch of the hub's root nid when we have a hub_id but
  // not a nid yet (loadWorkspace's async path hasn't settled).
  _ensureNid(ctx) {
    if (ctx && ctx.nid) return Promise.resolve(ctx);
    if (!ctx || !ctx.hub_id) return Promise.resolve(null);
    return this.fetchService(SERVICE.hub.get_attributes, { hub_id: ctx.hub_id })
      .then((attrs) => {
        const nid = attrs && (attrs.actual_home_id || attrs.home_id || attrs.nid);
        return nid ? { hub_id: ctx.hub_id, nid } : null;
      })
      .catch(() => null);
  }

  _submit() {
    if (this._pending) return;
    const data = this.getData(_a.formItem) || {};
    const filename = (data.filename || "").trim();
    if (!filename) {
      this.ensurePart("error").then((p) => {
        p.setState(1);
        p.set({ content: LOCALE.REQUIRE_THIS_FIELD || "Please enter a name" })
      })
      // Wm.alert(LOCALE.REQUIRE_THIS_FIELD || "Please enter a name");
      return;
    }

    const ctx = this._resolveContext();
    if (!ctx || !ctx.hub_id) {
      this.warn("folder_form: cannot resolve workspace context");
      Wm.alert(LOCALE.ERROR_SERVER || "Cannot resolve target workspace");
      return;
    }

    this._pending = 1;
    this._ensureNid(ctx).then((resolved) => {
      if (!resolved) {
        this._pending = 0;
        Wm.alert(LOCALE.ERROR_SERVER || "Cannot resolve target workspace");
        return;
      }
      return this.postService(SERVICE.media.make_dir, {
        hub_id: resolved.hub_id,
        nid: resolved.nid,
        dirname: filename,
        notify: 1,
      })
        .then(() => {
          if (this.parent && _.isFunction(this.parent.clear)) {
            return this.parent.clear();
          }
          this.goodbye();
        })
        .catch((e) => {
          this._pending = 0;
          this.warn("Failed to create folder", e);
          if (this.onServerError) this.onServerError(e);
        });
    });
  }
}

module.exports = __folder_form;
