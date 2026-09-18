const __player = require("player/interact");
const { EXT, DATA_TYPE } = require("libs/blocknote-format");
const { TweenMax, Expo } = require("@drumee/ui-core/vendor");

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
      const now = Dayjs().format("DD-MMM-YYYY HH:mm");
      this.model.atLeast({
        filename: LOCALE.NOTE_ON_DATE_X.format(now).replace(/\//g, "-"),
      });
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

    this._onBeforeUnload = this.checkUnsavedWork.bind(this);
    window.addEventListener("beforeunload", this._onBeforeUnload);
    // Where a new note gets written. Captured now, because by save time this
    // window is itself the active one.
    this.lastActiveWindow = Wm.getActiveWindow();
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
        });
        break;
      }
      default:
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
    if (!this._readOnly) this._setStatus("converting");
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
    if (this._readOnly) return;
    this._changed = 1;
    if (this._status !== "saving") this._setStatus("unsaved");
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this._timer = null;
      this.saveContent();
    }, AUTOSAVE_MS);
  }

  /**
   * Mirror the page title into the window topbar, so the two never disagree.
   * @param {String} name
   */
  _syncWindowTitle(name) {
    if (!this.ensurePart) return;
    this.ensurePart("ref-window-name")
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
   * @returns {String|undefined}
   */
  checkUnsavedWork() {
    if (this._changed && !this._readOnly) return LOCALE.CONFIRM_QUIT;
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
    if (!this._state) return;
    const content = this._state.getContent();
    if (content == null) return;

    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    let target = this.lastActiveWindow || Wm.getActiveWindow();
    if (this.media && this.media.logicalParent) {
      target = this.media.logicalParent;
    }
    if (!target) return;

    const pid = target.mget(_a.nid) || Visitor.get(_a.home_id);
    const hub_id = target.mget(_a.hub_id) || Visitor.get(_a.id);
    const nid = this.mget(_a.nid);
    let filename = this.mget(_a.filename);
    if (!filename && this.media) filename = this.media.mget(_a.filename);

    this._saving = 1;
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
          return;
        }
        // Adopt the node so every later save REPLACES this file instead of
        // creating another one.
        this.mset({ nid: data.nid, id: data.nid });
        this._changed = 0;
        this._setStatus("saved");
        this._reflectInTarget(target, data);
        if (this._again) {
          this._again = 0;
          this.saveContent();
          return;
        }
        if (close) this.goodbye();
      })
      .catch((e) => {
        this._saving = 0;
        this._again = 0;
        this._setStatus("unsaved");
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
  _reflectInTarget(target, data) {
    if (!target || !_.isFunction(target.getItemsByAttr)) return;
    let [file] = target.getItemsByAttr(_a.nid, data.nid);
    if (!file) {
      if (!_.isFunction(target.insertMedia)) return;
      const item = {
        kind: target._getKind(),
        metatype: _a.note,
        logicalParent: target,
        pid: target.getCurrentNid(),
        hub_id: target.mget(_a.hub_id),
        ...data,
      };
      delete item.replace;
      target.insertMedia(item);
      [file] = target.getItemsByAttr(_a.nid, data.nid);
      if (file) this.media = file;
      return;
    }
    if (_.isFunction(file.restart)) {
      file.mset(data);
      file.restart("media:modified");
      this.media = file;
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

      case _e.close:
        this.goodbye();
        break;
      default:
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
    // Last write wins: flush an unsaved note on close, the way editor_note does.
    if (this._changed && !this._readOnly && !this._saving) this.saveContent();
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }
}

export default __editor_blocknote;
