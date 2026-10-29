const __player = require("player/interact");
const { EXT, DATA_TYPE } = require("libs/blocknote-format");
const { TweenMax, Expo } = require("@drumee/ui-core/vendor");
const share = require("builtins/player/widget/share");
const page = require("./page");
const { isEditIntentKey, shareDesk, editWouldBeGated, gateEdit } = require("libs/dmz-edit-gate");

// How long after the last keystroke an untouched note writes itself back.
// BlockNote fires onChange per keystroke, so every edit MUST go through this
// debounce: a save per change races the create → adopt-nid → replace sequence
// and fills the folder with duplicates of the same note.
const AUTOSAVE_MS = 2500;

/**
 * Notion-style Note, built on BlockNote.
 *
 * This REPLACES the markdown Note (Lexis, via Duy, 2026-09-18). Two kinds of
 * file reach it: the `.dnote` files it writes itself, and notes still in the
 * old markdown format, which are imported for reading.
 *
 * 🚨 A markdown note is UPGRADED, never written back as markdown. BlockNote's
 * own export is lossy by name (`blocksToMarkdownLossy` — it un-nests children
 * and drops styles), so saving a document back to markdown would shave a
 * little off it every time. Instead the first save writes the new format under
 * the `.dnote` extension against the SAME nid, which media.save turns into an
 * in-place conversion: one node, same id, the name the user sees unchanged
 * (Drumee hides extensions), and a version snapshot of the markdown kept
 * behind it. The legacy `editor_note` is untouched — the desk reminder still
 * uses it.
 *
 * Structure mirrors editor/diagram: this window owns chrome, dirty state and
 * saving; `blocknote_state` owns the editor surface.
 */
class __editor_blocknote extends __player {
  /**
   *
   */
  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.isEditor = 1;
    this.isPlayer = 1;
    this.escapeContextmenu = true;

    if (opt.media && opt.media.isMfs) {
      this.media = opt.media;
      this.copyPropertiesFrom(this.media);
    } else {
      /** A brand-new note belongs to the visitor until its first save. */
      this.mset({
        hub_id: Visitor.id,
        pid: Visitor.get(_a.home_id),
        privilege: _K.privilege.owner,
      });
      // No name is filled in for the user (Lexis, 2026-09-29): the title
      // starts empty under its "New page" placeholder (Figma, 2026-10-23 —
      // was "Untitled"), and saveContent() falls back to it until something
      // is typed there.
    }

    // FULL-FRAME (Duy, 2026-09-16): the editor is DOCKED to the workspace, not
    // a big floating box. max_size() was the first attempt and was wrong — it
    // insets by 20/10 and leaves the window draggable, which is exactly what
    // still read as "a floating window".
    //
    // This is the same mechanism player/document (the Docs viewer) uses when it
    // opens maximized: fill the WM container, then track it with a
    // ResizeObserver. `_zoomed` is what tells the tracker to keep re-fitting.
    this._zoomed = true;

    // The page decorations (icon, cover) — read from the file by
    // blocknote_state, written back with it. See ./page.
    this._page = { icon: "", cover: null };
    this._onBeforeUnload = this.checkUnsavedWork.bind(this);
    window.addEventListener("beforeunload", this._onBeforeUnload);
    // Where a new note gets written. Captured now, because by save time this
    // window is itself the active one.
    this.lastActiveWindow = Wm.getActiveWindow();
    // A share's window manager passes itself (dmz/wm _newNote): the way to
    // the share's edit gate (_shareDesk).
    this._launchTarget = opt.target || null;
    // Launched from the Open-File Switcher ("Note" in its create menu): the
    // panel names the listed folder, and that folder wins (as editor/docs).
    // The active window may then be the viewer being switched away from —
    // its nid is a FILE's, no place to save in. The new tile goes into the
    // window the switch came from (the viewer's `target`, the active window,
    // or the window the viewer's file was opened from), only when it holds
    // tiles (insertMedia — a player's getCurrentNid is its file's folder too)
    // and shows this very folder.
    if (!this.media && opt.folder && opt.folder.nid && opt.folder.hub_id) {
      const { nid, hub_id } = opt.folder;
      const viewer = this.lastActiveWindow;
      this._folder = { pid: nid, hub_id };
      this.lastActiveWindow =
        [opt.target, viewer, viewer && viewer.media && viewer.media.logicalParent].find(
          (t) =>
            t &&
            !(_.isFunction(t.isDestroyed) && t.isDestroyed()) &&
            _.isFunction(t.insertMedia) &&
            _.isFunction(t.getCurrentNid) &&
            t.getCurrentNid() == nid &&
            t.mget(_a.hub_id) == hub_id
        ) || null;
    }
    // A new note lives where it will be saved — the folder it was created
    // from. The Open-File Switcher lists that folder (it reads pid/hub_id),
    // and Share names the right workspace; the home defaults above only stay
    // when no folder window is open.
    if (!this.media) {
      const dest = this._saveTarget();
      if (dest) this.mset({ pid: dest.pid, hub_id: dest.hub_id });
    }
  }

  /**
   * The WM canvas: right of the desk sidebar, below the header. Falls back to
   * the viewport when the desk chrome is not mounted (DMZ share view).
   */
  _workspaceRect() {
    const el =
      document.querySelector(".desk-module__wm-container") ||
      document.querySelector(".desk-module__right-side");
    if (!el) {
      return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    }
    const r = el.getBoundingClientRect();
    return {
      left: Math.round(r.left),
      top: Math.round(r.top),
      width: Math.round(r.width),
      height: Math.round(r.height),
    };
  }

  /**
   * The same rect, expressed relative to the element's offset parent — which
   * is what `left`/`top` are actually applied against.
   */
  _workspaceTarget() {
    const ws = this._workspaceRect();
    const parent = this.el.offsetParent || this.el.parentElement || document.body;
    const pr = parent.getBoundingClientRect();
    return {
      left: Math.round(ws.left - pr.left),
      top: Math.round(ws.top - pr.top),
      width: ws.width,
      height: ws.height,
    };
  }

  /**
   * Fill the workspace. Both the style model and the element are written: the
   * model is what the WM reads back, the element is what the user sees.
   */
  _applyWorkspaceBounds() {
    if (!this.el) return;
    const target = this._workspaceTarget();
    this.size = {
      width: target.width,
      height: target.height - (this.topbarHeight || 0),
    };
    this.$el.stop(true, false);
    this.style.set(target);
    this.$el.css(target);
  }

  /**
   * Keep the editor filling the workspace when the workspace itself changes —
   * browser resize, sidebar collapse, the desk header showing or hiding.
   * Watching the container covers every one of those with a single listener.
   */
  _observeWorkspace() {
    if (this._wsObserver || typeof ResizeObserver === "undefined") return;
    const el =
      document.querySelector(".desk-module__wm-container") ||
      document.querySelector(".desk-module__right-side");
    if (!el) return;
    this._wsObserver = new ResizeObserver(() => {
      if (this._zoomed) this._applyWorkspaceBounds();
    });
    this._wsObserver.observe(el);
  }

  /**
   * Opens docked to the workspace. `display()` is called by onPartReady with a
   * size the player base would otherwise fit the window to; that argument is
   * ignored on purpose — the workspace decides the geometry, nothing else.
   */
  display() {
    this.el.dataset.ready = 1;
    this.el.style.pointerEvents = "";
    if (!this._raisedOnDisplay) {
      this._raisedOnDisplay = 1;
      this.raise();
    }
    this._applyWorkspaceBounds();
    this._observeWorkspace();
    TweenMax.fromTo(this.$el, 0.35, { opacity: 0 }, { opacity: 1, ease: Expo.easeOut });
  }

  /**
   *
   */
  onDomRefresh() {
    this.feed(require("./skeleton")(this));
  }

  /**
   * @param {View} child
   * @param {String} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.content: {
        this.display();
        this.setupInteract();
        this.raise();
        const kind = "blocknote_state";
        Kind.waitFor(kind).then(() => {
          child.feed({ kind, media: this.media, editor: this });
          this._state = child.children.last();
          this._wireShareEditGate(this._state);
        });
        break;
      }
      default:
        if (page.onPartReady(this, child, pn)) break;
        super.onPartReady(child, pn);
    }
  }

  /**
   * Deliberately does NOT call super.setupInteract().
   *
   * The base makes the window draggable and resizable. A surface docked to the
   * whole workspace has nowhere to be dragged to, and being able to drag it
   * away is what made this read as a floating window. So the only interaction
   * wired here is the save hotkey.
   *
   * Ctrl/Cmd+S saves immediately, bound in the capture phase so it beats both
   * the browser's "Save page" dialog and the editor's own key handling.
   */
  setupInteract() {
    if (this._hotkeysWired || !this.el) return;
    this._hotkeysWired = 1;
    this.el.addEventListener(
      "keydown",
      (e) => {
        if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
        if (String(e.key).toLowerCase() !== "s") return;
        e.preventDefault();
        e.stopPropagation();
        this.saveContent();
      },
      true
    );
  }

  /**
   * This note arrived in the OLD markdown format and is being shown from an
   * imported copy. Nothing is written yet — the upgrade happens on the first
   * save — so say so rather than leaving the status reading "saved".
   */
  markConverting() {
    this._fromLegacy = 1;
    // A reader cannot save, so nothing will be upgraded: say nothing.
    if (!this._readOnly && !this.isViewOnly()) this._setStatus("converting");
  }

  /**
   * A note we could not read is never written back — see blocknote_state.
   * @param {String} reason
   */
  setReadOnly(reason) {
    this._readOnly = reason || 1;
    this._setStatus("readonly");
  }

  /**
   * Called by blocknote_state on every real edit.
   */
  markDirty() {
    if (this._readOnly || this.isViewOnly()) return;
    this._changed = 1;
    // Counts edits, so a save in flight knows whether it holds the latest.
    this._editGen = (this._editGen || 0) + 1;
    if (this._status !== "saving") this._setStatus("unsaved");
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this._timer = null;
      this.saveContent();
    }, AUTOSAVE_MS);
  }

  /**
   * The page decorations as they will be saved.
   * @returns {{icon: String, cover: Object|null}}
   */
  page() {
    return { icon: this._page.icon || "", cover: this._page.cover || null };
  }

  /**
   * Called by blocknote_state with what the file holds.
   * @param {{icon: String, cover: Object|null}} p
   */
  setPage(p = {}) {
    this._page = { icon: p.icon || "", cover: p.cover || null };
    page.paint(this);
  }

  /**
   * Change one decoration as a user edit: repaint, then save like any edit.
   * A note we could not read is never written, decorations included.
   * @param {Object} change
   */
  updatePage(change) {
    if (this._readOnly) return;
    this._page = { ...this._page, ...change };
    page.paint(this);
    this.markDirty();
  }

  /**
   * Whether this session may write the note. A brand-new note belongs to its
   * author; an opened one follows the node's privilege.
   * @returns {Boolean}
   */
  canEditNote() {
    if (this._readOnly || Visitor.inDmz) return false;
    if (!this.media) return true;
    return _.isFunction(this.media.canUpload) ? !!this.media.canUpload() : true;
  }

  /**
   * An existing note this session may not write (the node's privilege has no
   * write bit): the body opens read-only, as the markdown Note rendered its
   * textarea readonly when !canUpload(). Typing into it would only autosave
   * into a refusal and lose the text on close.
   * @returns {Boolean}
   */
  isViewOnly() {
    // In a share the share decides: an anonymous visitor reports the creator's
    // privilege (canUpload passes) yet the server refuses the write.
    if (editWouldBeGated(this._shareDesk())) return true;
    if (!this.media || !_.isFunction(this.media.canUpload)) return false;
    return !this.media.canUpload();
  }

  /**
   * The secure-share sharebox when this note is opened inside a share, else
   * null (on the desk). In a share window.Wm is the share's window manager.
   * @returns {Object|null}
   */
  _shareDesk() {
    return shareDesk(this._launchTarget, window.Wm);
  }

  /**
   * In a share, an attempt to edit a body the visitor may not write meets the
   * share's gate — sign-up for an anonymous visitor, Request Access for a
   * recipient without the edit grant — instead of nothing at all. The body is
   * read-only for them (isViewOnly), so it is made focusable: a click in it
   * focuses it and the keystrokes that mean "edit" reach this listener.
   * Reading keys (arrows, copy, select-all…) never gate. A granted visitor is
   * never gated and types as usual.
   * @param {View} state the blocknote_state holding the body
   */
  _wireShareEditGate(state) {
    const desk = this._shareDesk();
    if (!desk || !state || !state.el || state._shareGateWired) return;
    state._shareGateWired = 1;
    if (!state.el.hasAttribute("tabindex")) state.el.setAttribute("tabindex", "-1");
    const gate = (e) => {
      if (e.type === "keydown" && !isEditIntentKey(e)) return;
      if (!editWouldBeGated(desk)) return;
      if (gateEdit(desk, this)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    for (const ev of ["keydown", "paste", "drop"]) {
      state.el.addEventListener(ev, gate, true);
    }
  }

  /**
   * The source MFS view acts on the node — Share and the file's chat thread
   * go to it, the same way the document player forwards them.
   * @returns {Boolean} whether it took the event
   */
  _delegate(cmd, args) {
    const media = this.media;
    if (!media || media.isDestroyed() || !_.isFunction(media.onUiEvent)) {
      return false;
    }
    media.onUiEvent(cmd, args);
    return true;
  }

  /**
   * Run `fn` once the note exists on the server. Share, cover and comments
   * all need a node; a brand-new note gets one by saving first.
   * @param {Function} fn
   */
  _withNode(fn) {
    if (this.mget(_a.nid)) return fn();
    if (this._readOnly) return;
    this._afterSave = fn;
    this.saveContent();
  }

  /**
   * Expand: the note alone, full screen. Escape (the browser's own) or the
   * same button brings it back.
   */
  _toggleFullscreen() {
    const doc = document;
    if (doc.fullscreenElement) {
      if (doc.exitFullscreen) doc.exitFullscreen().catch(() => {});
      return;
    }
    if (this.el && this.el.requestFullscreen) {
      this.el.requestFullscreen().catch((e) => this.warn("editor_blocknote: fullscreen refused", e));
    }
  }

  /**
   * Mirror the page title into the window topbar, so the two never disagree.
   * @param {String} name
   */
  _syncWindowTitle(name) {
    if (!this.ensurePart) return;
    this.ensurePart("player-title")
      .then((p) => {
        if (p && p.el && !p.isDestroyed() && p.set) p.set({ content: name });
      })
      .catch(() => { });
  }

  /**
   * @param {"saved"|"saving"|"unsaved"|"readonly"|"converting"} state
   */
  _setStatus(state) {
    this._status = state;
    const labels = {
      saved: LOCALE.ALL_CHANGES_SAVED,
      saving: LOCALE.SAVING,
      unsaved: LOCALE.UNSAVED_CHANGES,
      readonly: LOCALE.NOTE_UNREADABLE,
      converting: LOCALE.NOTE_UPGRADES_ON_SAVE,
      exporting: LOCALE.NOTE_EXPORTING,
    };
    if (!this.ensurePart) return;
    this.ensurePart("save-status")
      .then((p) => {
        if (!p || !p.el || p.isDestroyed()) return;
        if (p.set) p.set({ content: labels[state] || labels.saved });
        // Note.set() re-renders and drops anything stamped on the old element,
        // so stamp the state after it, and once more on the next tick.
        const stamp = () => {
          if (p.el && !p.isDestroyed()) p.el.dataset.state = state;
        };
        stamp();
        setTimeout(stamp, 0);
      })
      .catch(() => { });
  }

  /**
   * The tab's beforeunload listener. Registered with addEventListener, where
   * the return value is ignored: the browser asks "leave this page?" only when
   * the event is cancelled (returnValue for older browsers).
   * @param {BeforeUnloadEvent} [e]
   * @returns {String|undefined}
   */
  checkUnsavedWork(e) {
    if (!this._changed || this._readOnly) return undefined;
    if (e) {
      e.preventDefault();
      e.returnValue = LOCALE.CONFIRM_QUIT;
    }
    return LOCALE.CONFIRM_QUIT;
  }

  /**
   * The folder the note lives in — where it is saved, and where its exports
   * are written next to it.
   * @returns {{target: Object, pid: String, hub_id: String}|null}
   */
  _saveTarget() {
    // The folder the Open-File Switcher named: fixed, whatever is active.
    if (this._folder) {
      const target = (this.media && this.media.logicalParent) || this.lastActiveWindow || null;
      return { target, ...this._folder };
    }
    let target = this.lastActiveWindow || Wm.getActiveWindow();
    if (this.media && this.media.logicalParent) {
      target = this.media.logicalParent;
    }
    if (!target) return null;
    return {
      target,
      pid: target.mget(_a.nid) || Visitor.get(_a.home_id),
      hub_id: target.mget(_a.hub_id) || Visitor.get(_a.id),
    };
  }

  /**
   * The note's name as it is saved.
   *
   * An untitled note reuses the name the server gave it on the first save.
   * The server de-duplicates a NEW node ("New page(1)") but renames an
   * existing one to exactly what it is sent — and media has a UNIQUE key on
   * (parent_id, user_filename, extension), so re-sending "New page" for the
   * second untitled note in a folder would make every later save fail.
   * @returns {String}
   */
  _noteName() {
    return (
      this.mget(_a.filename) ||
      (this.media && this.media.mget(_a.filename)) ||
      this._assignedName ||
      LOCALE.NOTE_NEW_PAGE
    );
  }

  /**
   * Export the note (Lexis, 2026-09-29). Each export is BOTH written into the
   * note's folder in Drumee and downloaded to the device.
   *
   * - html / md / csv are built in the browser. Someone who cannot write to
   *   the folder still gets the download; the copy in Drumee is skipped.
   * - pdf / docx are made by the server (media.save `convert_to`, LibreOffice)
   *   and so always land in the folder first; the download is that file.
   * - print hands the page to the browser, whose print dialog also offers
   *   "Save as PDF" — the way to a PDF for someone who cannot write here.
   *
   * An export never overwrites anything: it is a new file, and the server
   * suffixes the name if one is taken ("Plan(1).pdf").
   *
   * @param {String} format  html | pdf | docx | md | csv | print
   */
  async exportNote(format) {
    if (!this._state || !this._state.exportAs || this._exporting) return;
    this._exporting = 1;
    try {
      const x = await this._state.exporter();
      const name = this._noteName();

      if (format === "print") {
        const body = await this._state.exportAs("print");
        if (body == null) return;
        const { default: printJS } = await import(/* webpackChunkName: "print-js" */ "print-js");
        printJS({ printable: body, type: "raw-html", style: x.printStyle() });
        return;
      }

      const fmt = x.FORMATS[format];
      if (!fmt) return;
      const dest = this._exportTarget();
      if (fmt.server && !dest) {
        Wm.alert(LOCALE.NOTE_EXPORT_NEEDS_EDIT);
        return;
      }

      const data = await this._state.exportAs(fmt.server ? "html" : format, name);
      if (data == null) return;
      let files = [{ name, content: data }];
      if (format === "csv") {
        if (!data.length) {
          Wm.alert(LOCALE.NOTE_NO_TABLE);
          return;
        }
        files = data.map((content, i) => ({ name: i ? `${name}-${i + 1}` : name, content }));
      }

      this._setStatus("exporting");
      for (const f of files) {
        const filename = `${f.name}.${fmt.ext}`;
        const saved = dest ? await this._saveExport(dest, filename, fmt, f.content) : null;
        if (fmt.server) {
          const { svc, keysel } = bootstrap();
          const ksel = keysel ? `&keysel=${keysel}` : "";
          await this.fetchFile({
            url: `${svc}media.orig?nid=${saved.nid}&hub_id=${saved.hub_id || dest.hub_id}${ksel}`,
            download: saved.filename ? `${saved.filename}.${fmt.ext}` : filename,
          });
        } else {
          this.getBlob(new Blob([f.content], { type: `${fmt.mime};charset=utf-8` }), filename);
        }
      }
      this._setStatus(this._changed ? "unsaved" : "saved");
    } catch (e) {
      this.warn("editor_blocknote: export failed", e);
      this._setStatus(this._changed ? "unsaved" : "saved");
      Wm.alert(LOCALE.NOTE_EXPORT_FAILED);
    } finally {
      this._exporting = 0;
    }
  }

  /**
   * Where an export is written, or null when this user cannot write there —
   * then an export is download-only.
   * @returns {{target: Object, pid: String, hub_id: String}|null}
   */
  _exportTarget() {
    const dest = this._saveTarget();
    if (!dest) return null;
    const { target } = dest;
    if (target && _.isFunction(target.canUpload) && !target.canUpload()) return null;
    return dest;
  }

  /**
   * Write one export file next to the note and show it in the folder.
   * @returns {Promise<Object>} the new node; throws when the server refuses
   */
  async _saveExport(dest, filename, fmt, content) {
    const opt = {
      service: SERVICE.media.save,
      hub_id: dest.hub_id,
      // No `id`: always a NEW file, never a replace.
      nid: dest.pid,
      pid: dest.pid,
      position: 999999,
      filename,
      filetype: fmt.filetype,
      content,
    };
    if (fmt.server) opt.convert_to = fmt.ext;
    const data = await this.postService(opt, { async: 1 });
    if (!data || !data.nid) throw new Error(`media.save returned no node for ${filename}`);
    this._reflectInTarget(dest.target, data, { adopt: false });
    return data;
  }

  /**
   * Save what is pending before the window goes away — the Open-File
   * Switcher closes this editor to show the next file, and only once this
   * resolves true. False (the save failed, or there is nowhere to save) keeps
   * the user on the note, so nothing typed is lost to the switch.
   * @returns {Promise<Boolean>}
   */
  saveBeforeClose() {
    if (this._readOnly) return Promise.resolve(true);
    if (!this._changed && !this._saving) return Promise.resolve(true);
    return new Promise((resolve) => {
      this._closeWaiters = [...(this._closeWaiters || []), resolve];
      if (!this._saving) this.saveContent();
      // The save in flight predates the latest edits: write once more before
      // answering, or the window would close on the older content.
      else if ((this._editGen || 0) !== this._savingGen) this._again = 1;
    });
  }

  /**
   * Answer every saveBeforeClose() waiting on the save that just ended.
   * @param {Boolean} ok
   */
  _settleClose(ok) {
    const waiters = this._closeWaiters || [];
    this._closeWaiters = null;
    waiters.forEach((resolve) => resolve(ok));
  }

  /**
   * Write the note back through media.save, the same text path the existing
   * note and markdown editors use.
   *
   * @param {Number} close close the window once the save lands
   */
  saveContent(close = 0) {
    if (this._readOnly) return;
    if (this._saving) {
      // A save is already in flight; remember that more has changed since.
      this._again = 1;
      return;
    }
    if (!this._state) return this._settleClose(false);
    // Taken with the content: the edits this save carries.
    const gen = this._editGen || 0;
    const content = this._state.getContent();
    if (content == null) return this._settleClose(false);

    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    const dest = this._saveTarget();
    if (!dest) return this._settleClose(false);
    const { target, pid, hub_id } = dest;
    const nid = this.mget(_a.nid);
    const filename = this._noteName();

    this._saving = 1;
    this._savingGen = gen;
    this._setStatus("saving");
    this.postService(
      {
        service: SERVICE.media.save,
        hub_id,
        nid: nid || pid,
        pid,
        id: nid,
        position: this.mget(_a.position) || 999999,
        filename: `${filename}.${EXT}`,
        filetype: _a.note,
        metadata: { dataType: DATA_TYPE },
        content,
      },
      { async: 1 }
    )
      .then((data) => {
        this._saving = 0;
        if (!data || !data.nid) {
          this._setStatus("unsaved");
          this.warn("editor_blocknote: save returned no node", data);
          this._settleClose(false);
          return;
        }
        // Adopt the node so every later save REPLACES this file instead of
        // creating another one.
        this.mset({ nid: data.nid, id: data.nid });
        if (!this.mget(_a.filename)) {
          const assigned =
            data.user_filename ||
            `${data.filename || ""}`.replace(new RegExp(`\\.${EXT}$`), "");
          if (assigned) this._assignedName = assigned;
        }
        // Edits made while this save was in flight are not in it: they stay
        // unsaved, and their own autosave timer is still pending.
        if ((this._editGen || 0) === gen) {
          this._changed = 0;
          this._setStatus("saved");
        } else {
          this._setStatus("unsaved");
        }
        this._reflectInTarget(target, data);
        page.paint(this);
        if (this._afterSave) {
          const next = this._afterSave;
          this._afterSave = null;
          next();
        }
        if (this._again) {
          this._again = 0;
          this.saveContent();
          return;
        }
        this._settleClose(true);
        if (close) this.goodbye();
      })
      .catch((e) => {
        this._saving = 0;
        this._again = 0;
        this._afterSave = null;
        this._setStatus("unsaved");
        this._settleClose(false);
        this.warn("editor_blocknote: save failed", e);
      });
  }

  /**
   * Show the saved note in the folder it was written into — insert the tile on
   * the first save, refresh it afterwards.
   *
   * @param {View} target
   * @param {Object} data the saved node
   */
  _reflectInTarget(target, data, { adopt = true } = {}) {
    if (!target || !_.isFunction(target.getItemsByAttr)) return;
    let [file] = target.getItemsByAttr(_a.nid, data.nid);
    if (!file) {
      if (!_.isFunction(target.insertMedia)) return;
      const item = {
        kind: target._getKind(),
        logicalParent: target,
        pid: target.getCurrentNid(),
        hub_id: target.mget(_a.hub_id),
        ...data,
      };
      // An export is its own file type; only the note itself is a note.
      if (adopt) item.metatype = _a.note;
      delete item.replace;
      target.insertMedia(item);
      [file] = target.getItemsByAttr(_a.nid, data.nid);
      if (file && adopt) this.media = file;
      return;
    }
    if (_.isFunction(file.restart)) {
      file.mset(data);
      file.restart("media:modified");
      if (adopt) this.media = file;
    }
  }

  /**
   * @param {View} cmd
   * @param {Object} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case _a.save:
      case _e.save:
        this.saveContent();
        break;
      // The in-page title. media.save already sends `filename` on every save and
      // the server renames in place for the same nid (replace_content writes
      // filename/user_filename through mfs_set_node_attr), so renaming rides on
      // the save path that already exists — no second service, no second node.
      case "rename-note": {
        const next = String(
          (cmd && cmd.getValue && cmd.getValue()) ||
          (cmd.el && cmd.el.querySelector("input") && cmd.el.querySelector("input").value) ||
          ""
        ).trim();
        if (!next || next === this.mget(_a.filename)) break;
        // A filename is a path segment: refuse the separators outright rather
        // than letting the server mangle them.
        const safe = next.replace(/[\/\\]/g, "-");
        this.mset({ filename: safe });
        this._syncWindowTitle(safe);
        this.markDirty();
        break;
      }

      // Header: Download is the PDF of the note; the gear menu has the rest.
      case "download-note":
        this.exportNote("pdf");
        break;

      // The gear menu's Export rows — see skeleton/topbar.
      case "export-note": {
        const format = cmd && cmd.mget && (cmd.mget("format") || cmd.mget(_a.value));
        if (format) this.exportNote(format);
        break;
      }

      // The gear menu's "Export" parent row: its submenu opens on hover.
      case "export-menu":
        break;

      // Share opens the secure-share panel, like every other file's.
      case "secure-share":
        this._withNode(() => share.click(this, cmd));
        break;

      case "note-fullscreen":
        this._toggleFullscreen();
        break;

      // Save first, as every other editor's X does (player/interact): a
      // failed save keeps the note open and asks before dropping the edits.
      case _e.close:
        this.closeAfterSave();
        break;
      default:
        // The page head — icon, cover, comments (./page).
        if (page.onUiEvent(this, cmd, service)) break;
        super.onUiEvent(cmd, args);
    }
  }

  /**
   *
   */
  onBeforeDestroy() {
    window.removeEventListener("beforeunload", this._onBeforeUnload);
    this._zoomed = false;
    try {
      if (this._wsObserver) this._wsObserver.disconnect();
    } catch (e) {
      /** already gone */
    }
    this._wsObserver = null;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    page.destroy(this);
    // Last write wins: flush an unsaved note on close, the way editor_note does.
    if (this._changed && !this._readOnly && !this._saving) this.saveContent();
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }
}

export default __editor_blocknote;
