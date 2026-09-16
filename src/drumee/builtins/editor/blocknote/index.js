const __player = require("player/interact");
const { EXT, DATA_TYPE } = require("libs/blocknote-format");

// How long after the last keystroke an untouched note writes itself back.
// BlockNote fires onChange per keystroke, so every edit MUST go through this
// debounce: a save per change races the create → adopt-nid → replace sequence
// and fills the folder with duplicates of the same note.
const AUTOSAVE_MS = 2500;

/**
 * Notion-style Note, built on BlockNote.
 *
 * Shipped ALONGSIDE the existing Note (`editor_markdown`) and the legacy
 * rich-text note (`editor_note`) rather than replacing either, so the old ones
 * stay available as a fallback until this is signed off. Nothing routes here
 * except files this editor itself wrote — they carry the `.dnote` extension.
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

    this.size.width = 760;
    this.size.height = 560;
    this.style.set({ ...this.size, minWidth: 320, minHeight: 240 });

    this._onBeforeUnload = this.checkUnsavedWork.bind(this);
    window.addEventListener("beforeunload", this._onBeforeUnload);
    // Where a new note gets written. Captured now, because by save time this
    // window is itself the active one.
    this.lastActiveWindow = Wm.getActiveWindow();
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
        this.display({ top: 85 });
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
   * Ctrl/Cmd+S saves immediately. Bound in the capture phase so it beats both
   * the browser's "Save page" dialog and the editor's own key handling.
   */
  setupInteract() {
    if (super.setupInteract) super.setupInteract();
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
   * @param {"saved"|"saving"|"unsaved"|"readonly"} state
   */
  _setStatus(state) {
    this._status = state;
    const labels = {
      saved: LOCALE.ALL_CHANGES_SAVED,
      saving: LOCALE.SAVING,
      unsaved: LOCALE.UNSAVED_CHANGES,
      readonly: LOCALE.NOTE_UNREADABLE,
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
