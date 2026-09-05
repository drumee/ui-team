/* ==================================================================== *
 * desk_breadcrumb — Desk-level breadcrumb widget
 * Listens to RADIO_BROADCAST "breadcrumb:content" emitted by window/core.js
 * whenever the active window navigates, and renders the path.
 * ==================================================================== */
const { getPath } = require("libs/path-request");

const PROPERTIES = [
  _a.area,
  _a.actual_home_id,
  _a.ctime,
  _a.ext,
  _a.filename,
  _a.filepath,
  _a.filetype,
  _a.filesize,
  _a.home_id,
  _a.hub_id,
  // The workspace's DISPLAY name. get_path puts it on every path row, and it
  // is the only place a workspace ROOT's name exists — the root's own
  // user_filename is empty. Without it here, _normalizeData dropped the one
  // field that can label the first crumb.
  _a.hub_name,
  _a.isalink,
  _a.md5Hash,
  _a.metadata,
  _a.mtime,
  _a.nid,
  _a.ownpath,
  _a.pid,
  _a.privilege,
  _a.service,
  _a.status,
]

class __desk_breadcrumb extends LetcBox {

  /**
   *
   */
  initialize(opt = {}) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this._sourceWindow = null;
    this._onWindowClosed = this._onWindowClosed.bind(this);
    this._onBrowse = this._onBrowse.bind(this);
    this._updateContent = this._updateContent.bind(this);
    this._updateContext = this._updateContext.bind(this);
    RADIO_BROADCAST.on("breadcrumb:content", this._updateContent);
    RADIO_BROADCAST.on("breadcrumb:context", this._updateContext);
  }

  /**
   *
   */
  onDestroy() {
    RADIO_BROADCAST.off("breadcrumb:content", this._updateContent);
    RADIO_BROADCAST.off("breadcrumb:context", this._updateContext);
  }

  /**
   * Render the track as: <Workspace> › <Folder> › … There is no longer a Home
   * anchor in front of it — see the skeleton. Empty data clears the track.
   *
   * NOTE: nothing here may ensurePart(_a.context) any more. That part is not
   * rendered, and ensurePart NEVER resolves for a part that will not mount —
   * the callback (and everything after it) would hang silently.
   * @param {*} data
   * @param {Object} [opt]
   * @param {Boolean} [opt.section] the track is a SECTION LABEL (Settings /
   *   Get help / Plan / Trash / Inbox…), not a filesystem path — see
   *   _setSectionMode. Every path caller leaves it off.
   */
  _buildContent(data, opt = {}) {
    const section = !!opt.section;
    this._setSectionMode(section);
    if (_.isEmpty(data)) {
      this._data = [];
      // Forget what is on screen, or the guard below would skip the repaint
      // that puts an identical track back after this clear.
      this._renderedSig = null;
      this.ensurePart(_a.content).then((p) => {
        p.clear();
      })
      return
    }
    this._data = data;
    this.ensurePart(_a.content).then((p) => {
      // mfs_get_path returns the workspace's root with filename "/" (or empty).
      // Substitute the workspace's display name (hub_name) so the breadcrumb
      // reads <Workspace> › <Folder> instead of / › <Folder>.
      const hubName = (data[0] && (data[0].hub_name || data[0].name)) || null;
      const normalized = this._normalizeData(data);
      const items = [];
      normalized.forEach((item, i) => {
        let filename = item && (item.filename || item.name);
        if ((!filename || filename === "/" || filename === "") && i === 0) {
          // The row's OWN hub_name first, the head row's second. get_path
          // carries the workspace display name on every row, so the row that
          // needs a name already has one — reading it only off `data[0]` meant
          // a one-row path (which is what a workspace ROOT is) had no name to
          // find, and the crumb was dropped by the `if (filename)` below. That
          // is the empty workspace name in the top bar.
          const name = (item && item.hub_name) || hubName;
          if (name) {
            filename = name;
            // Treat the workspace root as a hub so clicking it re-opens the
            // workspace via the hub branch of _loadActiveWindow.
            item.filetype = _a.hub;
          }
        }
        if (filename) {
          items.push({
            ...item,
            filename,
            kind: "desk_breadcrumb_item",
            service: "breadcrum-jump",
            isCurrent: i === normalized.length - 1,
            // Read by the crumb's own skeleton, which drops the folder glyph,
            // the "/" and the click target for a section label. It cannot be
            // derived there from the absence of a filetype: a workspace root
            // reached through get_path can arrive without one too.
            isSection: section ? 1 : 0,
          });
        }
      });
      // Identical track, already on screen — skip the rebuild.
      //
      // ONE navigation drives this widget two or three times over. Stepping
      // back out of a subfolder is the worst case: _loadActiveWindow paints an
      // optimistic crop, then Wm.openWorkspaceFolder resolves the real path and
      // drives the bar TWICE more — refreshBreadcrumbsUI mirrors into it, and
      // the explicit updateBreadcrumb beside that call covers the case where
      // the pane is not the focused one. All three land on the same crumbs
      // (getPath even collapses them onto one request), but feed() destroys and
      // rebuilds every crumb view each time, and that triple rebuild is the
      // flicker seen when navigating back.
      //
      // Fixed HERE rather than by deleting a driver: each of those callers
      // covers a case the others do not, and this is the single chokepoint they
      // all reach — so one guard settles it however many of them fire.
      //
      // A SIGNATURE, not a node key: renaming a folder changes the text without
      // changing any nid, and must still repaint. Same shape as the workspace
      // switcher's own revalidation guard.
      const sig = items
        .map((i) => `${i.hub_id}:${i.nid}:${i.filename}:${i.isCurrent ? 1 : 0}:${i.isSection}`)
        .join("|");
      if (sig === this._renderedSig) return;
      this._renderedSig = sig;
      p.feed(items);
    })
  }


  /**
   * Stamp the track as a SECTION LABEL rather than a filesystem path.
   *
   * Two skins read it. The crumb itself renders as text alone — no workspace
   * glyph, no "/" and no click target (breadcrumb/item/skeleton) — because a
   * section screen's label is not a node: there is no folder to draw and
   * nothing to jump to. And the topbar hides the workspace switcher's caret
   * that sits next to the track (desk/skin/topbar.scss), because a section
   * label is not a workspace to switch away from.
   *
   * The flag lives on THIS widget's root element, not on the crumb, because
   * that caret is authored as this widget's next sibling in the topbar's
   * left cluster (desk/skeleton/topbar.js) — which is the only handle CSS has
   * on it from here.
   *
   * @param {Boolean} section
   */
  _setSectionMode(section) {
    this._section = !!section;
    if (this.el) this.el.dataset.section = section ? 1 : 0;
  }

  /**
   * Is the track currently a section label rather than a path? Read by the
   * desk before rail navigation, which has to rebuild the workspace path only
   * when the bar is actually showing a section (Desk._leaveSectionScreen) —
   * every rail click would otherwise pay a get_path round trip for a
   * breadcrumb that is already correct.
   */
  isSectionMode() {
    return !!this._section;
  }

  /**
   * Clear the track (no path items).
   *
   * This used to ALSO reset the whole desk back to the legacy all-workspaces
   * grid via `Desk.loadHome()`. That screen is retired, so this is now purely
   * a breadcrumb concern: it empties the crumbs and touches nothing else.
   * Boot no longer needs the side effect either — Desk._restoreDeskState
   * opens a workspace (restored, deep-linked, or _openDefaultWorkspace).
   *
   */
  loadDefault() {
    this._buildContent();
  }

  /**
   *
   */
  onDomRefresh() {
    this.feed(require("./skeleton")(this))
    this._restoreCurrentPath()
  }

  /**
   * Paint where the desk ACTUALLY is, rather than clearing the track.
   *
   * This widget cannot assume it was alive when the navigation happened.
   * Desk._updateAddmenu re-feeds the WHOLE topbar whenever the viewer's
   * write/manage answer changes, which destroys this widget and mounts a new
   * one — and a workspace switch is precisely when that answer flips, because
   * two workspaces rarely grant the same rights. What that produced:
   *
   *   1. the OUTGOING instance consumes the "breadcrumb:content" broadcast and
   *      starts its get_path;
   *   2. the topbar is re-fed, so that instance is detached and destroyed;
   *   3. its get_path resolves and renders the crumbs into a dead element;
   *   4. the INCOMING instance mounts, calls loadDefault() — which CLEARS the
   *      track — and never hears another broadcast, because the only one for
   *      that switch was already spent.
   *
   * The workspace name then stayed blank until the next navigation. Asking the
   * window manager where we are, instead of waiting to be told, is what makes
   * that harmless: however often this widget is rebuilt, it repaints itself.
   *
   * The HEADLESS pane, not Wm.getActiveWindow: the breadcrumb reflects the desk
   * CONTAINER's node, which is what _updateContent's source check is also
   * protecting — a raised popup folder window (or a player) must not retitle
   * the bar. The pane's model tracks in-place subfolder navigation
   * (window/core refreshContent msets it), so this restores a deep path too.
   *
   * A section screen (Settings / Get help / Plan…) covering the desk is the one
   * case this gets wrong: a re-feed while one is open repaints the workspace
   * path under it rather than the section label. Deliberate — the label is not
   * recoverable from Wm, the screens are full-page and carry their own title,
   * and leaving one already rebuilds this path (Desk._leaveSectionScreen).
   */
  _restoreCurrentPath() {
    // window.Wm, never a bare `Wm`: the topbar can render BEFORE
    // window/manager.js assigns the global, where a bare identifier throws
    // ReferenceError — the same note the desk's own topbar helpers carry.
    const wm = window.Wm;
    if (!wm) return this.loadDefault();
    let nid = null;
    let hub_id = null;
    // headlessLayer explicitly, and only when it exists: folderWindowIn falls
    // back to getWindowsPool() for a missing pool, and that can answer a POPUP
    // folder window — whose navigation is private to it and must never retitle
    // this bar. At boot the layer is not up yet, which correctly leaves the
    // track to _curWorkspace and then to loadDefault().
    const pane = wm.headlessLayer && _.isFunction(wm.folderWindowIn)
      ? wm.folderWindowIn(wm.headlessLayer)
      : null;
    if (pane && !(pane.isDestroyed && pane.isDestroyed()) && pane.model) {
      const a = pane.model.toJSON();
      hub_id = a.hub_id;
      // Same hub normalisation as _onBrowse / _onWindowClosed.
      nid = a.filetype == _a.hub && a.actual_home_id ? a.actual_home_id : a.nid;
    } else if (wm._curWorkspace) {
      ({ hub_id, nid } = wm._curWorkspace);
    }
    // No workspace open (boot, or the desk with nothing loaded) — an empty
    // track is the right answer, exactly as before.
    if (!nid || !hub_id) return this.loadDefault();
    this._updatePath(nid, hub_id);
  }

  /**
   * Resolve a node's full path (workspace → folders) and render it. The
   * workspace is the leftmost crumb — there is no Home anchor in front of it.
   */
  _updatePath(nid, hub_id) {
    if (!nid || !hub_id) {
      this.warn("Require node data")
      return;
    }
    // Shared in-flight request: Wm.loadWorkspace asks for this exact path in
    // the same instant on a folder open (libs/path-request).
    getPath(this, { nid, hub_id }).then((data) => {
      // A destroyed instance must not paint. get_path takes long enough that a
      // topbar re-feed can land in the middle of it (see _restoreCurrentPath),
      // and the old instance was rendering its crumbs into a detached element —
      // work that is invisible at best and, while the live instance is doing
      // the same job, confusing to debug. Same guard window_folder's
      // _resolveMissingTitle uses on this call.
      if (this.isDestroyed && this.isDestroyed()) return;
      if (_.isEmpty(data)) return;
      this._buildContent(data)
    })
  }

  /**
   *
   */
  _onWindowClosed() {
    let w = Wm.getActiveWindow()
    if (w === Wm) {
      this.loadDefault()
      return;
    }

    let { nid, hub_id, actual_home_id, filetype } = w.model.toJSON();
    if (filetype == _a.hub && actual_home_id) nid = actual_home_id
    this._updatePath(nid, hub_id)
  }


  /**
   *
   */
  _onBrowse(data) {
    let { nid, hub_id, actual_home_id, filetype } = data;
    if (filetype == _a.hub && actual_home_id) nid = actual_home_id
    this._updatePath(nid, hub_id)
  }

  /**
   * Called whenever a window updates its navigation path.
   * The breadcrumb reflects the DESK CONTAINER's current node, not the
   * active folder window. So:
   *  - `event: _e.closed` (a folder window was closed): IGNORE — the desk
   *    container did not change.
   *  - `event: _e.home`: clear the track.
   *  - any other navigation: only update if the source IS the desk container
   *    (Wm itself or its grid). Folder window navigation is private to that
   *    window and must not retitle the breadcrumb.
   * @param {Array}  data   - Array of path items
   * @param {Object} source - The widget that triggered the broadcast
   */
  _updateContent(data = [], source) {
    switch (data.event) {
      case _a.closed:
        return;
      case _a.home:
        return this.loadDefault();
    }
    // Only follow navigation broadcasts that came from the desk container
    // (Wm) or its in-place loadWorkspaceNode flow. Ignore broadcasts that
    // bubble up from open folder/share/etc. windows — those windows have
    // their own internal state and should not retitle the desk breadcrumb.
    if (source && source !== Wm) return;
    this._onBrowse(data)
  }

  /**
   * Remove unwanted attributes
   */
  _normalizeData(data) {
    let res = []
    let items = data;
    if (!_.isArray(data)) {
      items = [data]
    }
    for (let item of items) {
      let r = {}
      for (let key in item) {
        if (PROPERTIES.includes(key)) {
          r[key] = item[key]
        }
      }
      res.push(r)
    }
    return res;
  }

  /**
   * Called when "breadcrumb:context" is broadcast (Apps / Settings / Contacts /
   * Trash labels). Renders as a single crumb: <Section>.
   * @param {Object} context data
   */
  _updateContext(data) {
    this._context = this._normalizeData(data)[0];
    const filename = this._context && (this._context.filename || this._context.name);
    if (!filename) return this.loadDefault();
    // A context crumb that carries node identity IS a workspace — the
    // switcher's `change-workspace` row hands its whole model in — so it keeps
    // the folder glyph and the caret. Only a bare label is a section screen;
    // every desk trigger of "breadcrumb:context" sends exactly {filename}.
    const section = !this._context.filetype && !this._context.nid;
    this._buildContent([{ ...this._context, filename }], { section });
  }

  /**
   * Walk the desk back to the clicked crumb — the ONLY way out of a subfolder
   * in the 2.0 shell, since the workspace pane renders no crumb strip of its
   * own (window_folder.refreshBreadcrumbsUI bails for a headless pane).
   *
   * It drives the WORKSPACE PANE. This used to re-point Wm's own `list` part
   * instead — the retired home grid, which sits in a layer BELOW the pane — so
   * a crumb click reloaded an invisible list, the pane never moved, and there
   * was no way back to a parent folder at all.
   *
   * Wm.openWorkspaceFolder is the one entry point the sidebar's folder rows
   * already use: it closes any section screen covering the desk, refreshes the
   * pane's content in place (window/core refreshContent), and re-resolves BOTH
   * breadcrumbs from get_path — so the track this click cropped is corrected by
   * the authoritative path a moment later, and _navStack is rebuilt with it.
   * Already-open folder WINDOWS are still left alone, as before.
   *
   * @param {View} cmd - The breadcrumb item view (has nid, hub_id, filetype)
   */
  _loadActiveWindow(cmd) {
    const filetype = cmd.mget(_a.filetype);
    if (filetype !== _a.hub && filetype !== _a.folder) return;

    const nid = cmd.mget(_a.nid);
    const hub_id = cmd.mget(_a.hub_id);
    if (!nid || !hub_id) return;

    // Crop breadcrumb path up to and including the clicked crumb, so the bar
    // answers the click immediately rather than after the round trip.
    const data = [];
    for (const item of this._data || []) {
      data.push(item);
      if (item.nid == nid && item.hub_id == hub_id) break;
    }
    if (data.length) this._buildContent(data);

    // window.Wm, never a bare `Wm`: this widget can be rebuilt at any time
    // (see _restoreCurrentPath) and a bare identifier throws ReferenceError
    // before the global is assigned.
    const wm = window.Wm;
    if (!wm || !_.isFunction(wm.openWorkspaceFolder)) return;
    wm.openWorkspaceFolder({
      hub_id,
      nid,
      area: cmd.mget(_a.area),
      filetype,
    });
  }

  /**
  * @param {*} cmd
  * @param {*} args
  */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || cmd.mget(_a.service);
    switch (service) {
      case "breadcrum-jump":
        return this._loadActiveWindow(cmd);
      case "change-workspace":
        this._loadActiveWindow(cmd);
        return this._updateContext(cmd.model.toJSON());
    }
  }

}

module.exports = __desk_breadcrumb;
