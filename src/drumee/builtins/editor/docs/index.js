const __player = require("player/interact");
const renameInline = require("builtins/player/widget/topbar/rename");
const { attachHelpContactMenu } = require("builtins/editor/help-contact-menu");
const collab = require("./collab");
const docTabs = require("./tabs");
const { TweenMax, Expo } = require("@drumee/ui-core/vendor");

require("./skin");

/**
 * Resolve when `p` does, or after `ms` — whichever comes first, and never
 * reject. Used around the Casual SDK's export/flush promises, which can stay
 * pending for good and must not be able to wedge a tab switch.
 *
 * @param {Promise} p
 * @param {Number} ms
 */
function capped(p, ms) {
  return Promise.race([
    Promise.resolve(p).catch(() => null),
    new Promise((r) => setTimeout(() => r(null), ms)),
  ]);
}

// Casual Docs (@casualoffice/docs DocxEditor) window — mirrors editor_sheet.
// The .docx is binary, so the workbook is stored base64-wrapped in JSON and
// saved through the same text media.save path (docs_state does the (de)coding).
class __editor_docs extends __player {
  /**
   *
   */
  initialize(opt = {}) {
    super.initialize(opt);
    this.escapeContextmenu = true;
    // Launch order stamp: a delayed self-raise (onReady/collab timers) must
    // never pop an OLDER editor over one the user opened afterwards.
    window.__drumeeEditorSeq = (window.__drumeeEditorSeq || 0) + 1;
    this._launchSeq = window.__drumeeEditorSeq;
    window.onbeforeunload = this.checkUnsavedWork.bind(this);
    if (!opt.media) {
      this.mset({
        hub_id: Visitor.id,
        pid: Visitor.get(_a.home_id),
        privilege: _K.privilege.owner,
      });
      // Google-Docs style default name; the server suffixes duplicates
      // ("Untitled document(1)"), so no timestamp is needed.
      this.model.atLeast({ filename: LOCALE.UNTITLED_DOCUMENT });
    } else {
      // Reopen: adopt the file's identity onto the WINDOW model so every save
      // REPLACES it in place. Without this the window has no nid, so each save
      // (Casual autosave fires onSave repeatedly) creates a fresh copy — the
      // grid fills with Document(1)…(177) duplicates.
      try {
        const node =
          (opt.media.actualNode && opt.media.actualNode()) ||
          (opt.media.toJSON && opt.media.toJSON()) ||
          {};
        const nid = node.nid || (opt.media.mget && opt.media.mget(_a.nid));
        const hub_id = node.hub_id || (opt.media.mget && opt.media.mget(_a.hub_id));
        const pid = node.pid || (opt.media.mget && opt.media.mget(_a.pid));
        if (nid) this.mset({ nid, id: nid });
        if (hub_id) this.mset({ hub_id });
        if (pid) this.mset({ pid });
      } catch (e) {
        /** falls through to create-on-save */
      }
    }
    this.target = opt.target || Wm.getActiveWindow();
  }

  /**
   *
   */
  onBeforeDestroy() {
    console.log("[DOCS] window onBeforeDestroy");
    window.removeEventListener("beforeunload", this.checkUnsavedWork.bind(this));
    try {
      if (this._wsObserver) this._wsObserver.disconnect();
    } catch (e) {
      /** already gone */
    }
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }

  /**
   *
   */
  checkUnsavedWork() {
    if (this._changed) return LOCALE.CONFIRM_QUIT;
  }

  /**
   * Drive the header's "All changes saved" label (part "save-status"), the
   * way the Casual/Google-Docs demo shows autosave state.
   * @param {"saved"|"saving"|"unsaved"} state
   */
  setSaveStatus(state) {
    const labels = {
      saved: LOCALE.ALL_CHANGES_SAVED || "All changes saved",
      saving: LOCALE.SAVING || "Saving…",
      unsaved: LOCALE.UNSAVED_CHANGES || "Unsaved changes",
    };
    this._saveState = state;
    if (!this.ensurePart) return;
    this.ensurePart("save-status")
      .then((p) => {
        if (!p || !p.el || p.isDestroyed()) return;
        if (p.set) p.set({ content: labels[state] || labels.saved });
        // Note.set() re-renders and drops anything stamped on the old el,
        // so stamp the state AFTER it (and once more on the next tick).
        const stamp = () => {
          if (p.el && !p.isDestroyed()) p.el.dataset.state = state;
        };
        stamp();
        setTimeout(stamp, 0);
      })
      .catch(() => {});
  }

  /**
   * Called by docs_state on every real edit: mark dirty + show "Unsaved".
   */
  markDirty() {
    this._changed = 1;
    // Edits that land while a save is in flight must survive it.
    this._changeSeq = (this._changeSeq || 0) + 1;
    if (this._saveState !== "saving") this.setSaveStatus("unsaved");
  }

  /**
   * Ctrl/Cmd+S saves IMMEDIATELY (bypasses the autosave debounce). Bound on
   * the window element in the capture phase so it wins over both the
   * browser's "Save page" dialog and Casual's own Ctrl+S handler.
   */
  _wireHotkeys() {
    if (this._hotkeysWired || !this.el) return;
    this._hotkeysWired = 1;
    // Any real press inside this window brings it above sibling editors
    // BEFORE the click lands, so the first click always hits this window.
    this.el.addEventListener(
      "pointerdown",
      () => {
        window.__drumeeEditorSeq = this._launchSeq = (window.__drumeeEditorSeq || 0) + 1;
        this._raiseAboveDesk(true);
      },
      true
    );
    // Casual's "Help" menubar item stays visible but opens a one-row Drumee
    // menu ("Contact us" → support conversation) instead of Casual's own
    // Help menu (Report issue / About). The menubar button carries no id:
    // match its label. See builtins/editor/help-contact-menu.
    const isHelp = (t) => {
      const b = t && t.closest && t.closest('button[aria-haspopup="menu"]');
      return !!(b && b.textContent.trim() === "Help" && !b.closest('[data-testid="formatting-bar"]'));
    };
    this._closeHelpMenu = attachHelpContactMenu(this, isHelp);
    this.el.addEventListener(
      "keydown",
      (e) => {
        if ((e.ctrlKey || e.metaKey) && !e.altKey && String(e.key).toLowerCase() === "s") {
          e.preventDefault();
          e.stopPropagation();
          this.saveContent();
          return;
        }
        // Enter in Casual's title input commits the pending rename now.
        if (e.key === "Enter" && this._renameTimer && e.target && e.target.tagName === "INPUT") {
          this._commitRename();
          e.target.blur();
        }
      },
      true
    );
    // Leaving the title field commits the pending rename without waiting.
    this.el.addEventListener(
      "focusout",
      (e) => {
        if (this._renameTimer && e.target && e.target.tagName === "INPUT") this._commitRename();
      },
      true
    );
  }

  /**
   * Open MAXIMIZED to the desk workspace (same as editor_sheet).
   */
  /**
   * Win the stacking fight with the desk's Files folder. Both windows are
   * SIBLINGS in the same WM layer; the folder window carries `z-index:1000`
   * on its root while this editor's root is `auto`, so the folder paints on
   * top whenever it re-raises (it does so once its large grid finishes
   * loading — after our raise()). raise() only reorders DOM, which a
   * positioned sibling with an explicit z-index ignores. So while the
   * editor is open its root sits one notch above the folder. The element is
   * destroyed with the window, so nothing needs restoring.
   */
  _raiseAboveDesk(force) {
    // Two maximized editors (docs + sheet) share the same z; a late timer
    // raise from the older one would cover the newer one and swallow the
    // user's first click ("bấm mấy lần mới ăn"). Only the most recently
    // launched editor may self-raise; a real pointerdown always may.
    if (!force && this._launchSeq !== window.__drumeeEditorSeq) return;
    try {
      if (this.el) this.el.style.zIndex = "1001";
    } catch (e) {
      /** best effort */
    }
    this.raise();
  }

  display() {
    this.raise();
    this._raiseAboveDesk();
    this.el.dataset.ready = 1;
    this.el.style.pointerEvents = "";
    this._zoomed = true;
    this._applyWorkspaceBounds(false);
    this._observeWorkspace();
    if (TweenMax) {
      TweenMax.fromTo(this.$el, 0.35, { opacity: 0 }, { opacity: 1, ease: Expo.easeOut });
    }
  }

  _workspaceRect() {
    const el =
      document.querySelector(".desk-module__wm-container") ||
      document.querySelector(".desk-module__right-side");
    if (!el) return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const r = el.getBoundingClientRect();
    return {
      left: Math.round(r.left),
      top: Math.round(r.top),
      width: Math.round(r.width),
      height: Math.round(r.height),
    };
  }

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

  _applyWorkspaceBounds(animate) {
    const target = this._workspaceTarget();
    const th = this.topbarHeight || 56;
    this.size = { width: target.width, height: target.height - th };
    this.$el.stop(true, false);
    if (animate) {
      this.$el.animate(target, {
        duration: 200,
        queue: false,
        complete: () => {
          this.$el.css(target);
          if (this.style) this.style.set(target);
        },
      });
    } else {
      if (this.style) this.style.set(target);
      this.$el.css(target);
    }
    try {
      window.dispatchEvent(new Event("resize"));
    } catch (e) {
      /** best effort */
    }
  }

  _observeWorkspace() {
    if (this._wsObserver || typeof ResizeObserver === "undefined") return;
    const el =
      document.querySelector(".desk-module__wm-container") ||
      document.querySelector(".desk-module__right-side");
    if (!el) return;
    this._wsObserver = new ResizeObserver(() => {
      if (this._zoomed) this._applyWorkspaceBounds(false);
    });
    this._wsObserver.observe(el);
  }

  /**
   *
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.content: {
        this.display();
        this.setupInteract();
        this.raise();
        let media = this.media;
        let kind = "docs_state";
        Kind.waitFor(kind).then(async () => {
          // A brand-new doc gets its Drumee node (and thus its collab room)
          // BEFORE the editor mounts, so co-editors can join from the start.
          if (!media && !this.mget(_a.nid)) {
            try {
              await this._createBlankNode();
            } catch (e) {
              this.warn("__editor_docs: pre-create failed, single-user", e);
            }
          }
          if (this.isDestroyed && this.isDestroyed()) return;
          child.feed({
            kind,
            media,
            editor: this,
            nid: this.mget(_a.nid),
            hub_id: this.mget(_a.hub_id),
            pid: this.mget(_a.pid),
          });
          this._doc = child.children.last();
        });
        break;
      }
      default:
        super.onPartReady(child, pn);
    }
  }

  /**
   *
   */
  onDomRefresh() {
    this.feed(require("./skeleton")(this));
    this._wireTitleRename();
    this._wireHotkeys();
  }

  /**
   * Header filename click-to-edit inline (same as editor_sheet).
   */
  _wireTitleRename() {
    if (!this.ensurePart) return;
    this.ensurePart("player-title")
      .then((p) => {
        if (!p || !p.el || p._renameWired) return;
        p._renameWired = 1;
        p.el.classList.add("editor-docs__editable-title");
        p.el.addEventListener("click", (e) => {
          e.stopPropagation();
          renameInline(this);
        });
      })
      .catch(() => {});
  }

  /**
   *
   */
  /**
   * Casual's inline title edited → rename the Drumee node (same call the
   * shared topbar rename helper makes) and refresh the grid tile.
   */
  renameFromCasual(name) {
    // Casual normalises the name to end in ".docx"; Drumee keeps the
    // extension (.udoc) separately, so store the bare stem.
    const filename = String(name || "").replace(/\.(udoc|docx)$/i, "");
    // Casual fires this on EVERY keystroke of its CONTROLLED title input.
    // Renaming on the server per keystroke made the field lag and snap
    // back (the prop only changed once the round-trip returned). Echo the
    // typed value locally at once and commit the rename after a pause (or
    // when the field is left — see _wireHotkeys).
    if (this._doc && this._doc.setDocumentName) this._doc.setDocumentName(filename);
    this._pendingRename = filename;
    clearTimeout(this._renameTimer);
    this._renameTimer = setTimeout(() => this._commitRename(), 900);
  }

  /**
   * Flush a pending inline rename to the server (idle timer, blur, Enter).
   */
  _commitRename() {
    clearTimeout(this._renameTimer);
    this._renameTimer = null;
    if (this._pendingRename == null) return;
    const filename = String(this._pendingRename).trim();
    this._pendingRename = null;
    if (!filename || filename === this.mget(_a.filename)) {
      if (this._doc && this._doc.setDocumentName) this._doc.setDocumentName(this.mget(_a.filename));
      return;
    }
    const node = this.media && !this.media.isDestroyed() ? this.media : this;
    const nid = node.mget(_a.nodeId) || node.mget(_a.nid) || this.mget(_a.nid);
    if (!nid) {
      this.mset({ filename });
      return;
    }
    this.postService(SERVICE.media.rename, {
      filename,
      nid,
      hub_id: node.mget(_a.hub_id) || this.mget(_a.hub_id),
      service: SERVICE.media.rename,
    })
      .then((r) => {
        if (this.update_name) this.update_name(_a.filename, filename);
        this.mset({ filename });
        // Keep Casual's (controlled) title input in sync with the new name.
        if (this._doc && this._doc.setDocumentName) this._doc.setDocumentName(filename);
        const media = this.media;
        if (media && !media.isDestroyed() && _.isFunction(media.afterRename)) {
          media.afterRename(r);
        }
      })
      .catch((e) => {
        this.warn("__editor_docs: rename failed", e);
        if (this._doc && this._doc.setDocumentName) this._doc.setDocumentName(this.mget(_a.filename));
      });
  }

  getCurrentMedia() {
    if (this.target) {
      return {
        pid: this.target.getCurrentNid(),
        hub_id: this.target.mget(_a.hub_id),
      };
    }
    return { hub_id: Visitor.id, pid: Visitor.get(_a.home_id) };
  }

  /**
   *
   */
  /**
   * Create the node on Drumee with a blank .docx (create + replace, the
   * media.save double-save) and adopt its nid — used for NEW docs before the
   * editor mounts so the file exists and has a stable collab room id.
   */
  async _createBlankNode() {
    const ctx = {
      hub_id: this.mget(_a.hub_id) || Visitor.get(_a.id),
      pid: this.mget(_a.pid) || Visitor.get(_a.home_id),
      filename: () => this.mget(_a.filename) || LOCALE.UNTITLED_DOCUMENT,
    };
    if (this.target) {
      const cur = this.getCurrentMedia();
      if (cur.pid) ctx.pid = cur.pid;
      if (cur.hub_id) ctx.hub_id = cur.hub_id;
      if (this.target.canUpload && !this.target.canUpload()) {
        ctx.hub_id = Visitor.get(_a.id);
        ctx.pid = Visitor.get(_a.home_id);
      }
    }
    this.mset({ hub_id: ctx.hub_id, pid: ctx.pid });
    const fs = collab.makeFileSource(this, ctx);
    const bytes = collab.base64ToAb(collab.BLANK_DOCX_B64);
    const { id } = await fs.save(null, bytes, { name: ctx.filename() });
    this.setSaveStatus("saved");
    return id;
  }

  async saveContent(opts) {
    // Co-editing mode: CasualEditor owns saving — just flush its autosave.
    // The failure MUST be surfaced: Casual's own label only ever reads
    // "Unsaved changes", so a save the server refuses (403 in a workspace the
    // viewer cannot write) looked like a dead Save button.
    if (this._doc && this._doc._collab && this._doc.flushCollabSave) {
      this.setSaveStatus("saving");
      try {
        const r = await this._doc.flushCollabSave();
        this.setSaveStatus(this._changed ? "unsaved" : "saved");
        return r;
      } catch (e) {
        this.setSaveStatus("unsaved");
        this.warn("__editor_docs: co-editing save failed", e);
        const status = e && (e.status || e.error_code);
        Wm.alert(status == 403 ? LOCALE.WEAK_PRIVILEGE : LOCALE.ERROR_NETWORK);
        return null;
      }
    }
    // `opts.content` is a payload the caller already built (persistTabs, which
    // must NOT export the editor: around a tab switch the editor still shows
    // the tab being left).
    if (opts && opts.content) return this._saveJson(opts.content);
    if (!this._doc || !this._doc.getContent) return;
    // Reentrancy guard: Casual autosave fires onSave repeatedly. Without this,
    // several saves race before the first assigns an nid — each takes the
    // create (replace:0) branch and spawns a duplicate. The double-save
    // follow-up clears the flag before its single replace-save.
    if (this._saving) return;
    this._saving = 1;
    this.setSaveStatus("saving");
    const stamp = this._changeSeq || 0;
    // Casual's onSave already carries a freshly exported .docx — reuse it
    // rather than running the (WASM) export a second time.
    const pre = opts && opts.bytes;
    const base64 = pre
      ? collab.abToBase64(
          pre.buffer ? pre.buffer.slice(pre.byteOffset, pre.byteOffset + pre.byteLength) : pre
        )
      : await this._doc.getContent();
    if (!base64) {
      this._saving = 0;
      this.setSaveStatus("unsaved");
      return;
    }
    // Tabs: the bytes just exported belong to the ACTIVE tab; the file keeps
    // every tab (docs/tabs.js writeTabs also mirrors the active one into
    // `docx`, so a reader that knows nothing about tabs still opens it).
    const content = JSON.stringify(this.tabsPayload(base64));

    const ext = this.mget(_a.ext) || "udoc";
    let filename = this.mget(_a.filename);
    const nid = this.mget(_a.nid);
    const replace = nid ? 1 : 0;

    let opt = {
      service: SERVICE.media.save,
      hub_id: this.mget(_a.hub_id) || Visitor.get(_a.id),
      nid,
      id: nid,
      replace,
      pid: this.mget(_a.pid) || Visitor.get(_a.home_id),
      filename: `${filename}.${ext}`,
      content,
      metadata: { dataType: "doc.casual" },
    };

    let target = this.target;
    if (this.media && this.media.logicalParent) target = this.media.logicalParent;

    if (!replace && this.target) {
      opt = { ...opt, ...this.getCurrentMedia() };
      opt.p = opt.pid;
      if (!this.target.canUpload || this.target.canUpload()) {
        return this._saveContent(opt, this.target, stamp);
      }
      opt.hub_id = Visitor.get(_a.id);
      opt.pid = Visitor.get(_a.home_id);
      opt.p = opt.pid;
      return this._saveContent(opt, Wm, stamp);
    }
    this._saveContent(opt, target, stamp);
  }

  /**
   * Replace the file with a payload the caller built (the tab list around a
   * switch). Only for a file that already exists — there is nothing to
   * re-point when the node has not been created yet.
   *
   * @param {String} content  the JSON to store
   */
  _saveJson(content) {
    const nid = this.mget(_a.nid);
    if (!nid) return null;
    const ext = this.mget(_a.ext) || "udoc";
    const opt = {
      service: SERVICE.media.save,
      hub_id: this.mget(_a.hub_id) || Visitor.get(_a.id),
      nid,
      id: nid,
      replace: 1,
      pid: this.mget(_a.pid) || Visitor.get(_a.home_id),
      filename: `${this.mget(_a.filename)}.${ext}`,
      content,
      metadata: { dataType: "doc.casual" },
    };
    return this.postService(opt, { async: 1 }).catch((e) => {
      this.warn("__editor_docs: tab list save failed", e);
      return null;
    });
  }

  /**
   * @param {number} stamp  _changeSeq at export time — edits typed while the
   *                        request was in flight keep the doc dirty.
   */
  _saveContent(opt, target, stamp) {
    this.postService(opt, { async: 1 })
      .then((data) => {
        if (!data || !data.nid) {
          this.warn("__editor_docs: save returned no node", data);
          this._saving = 0;
          return;
        }
        const editedMeanwhile = (this._changeSeq || 0) !== stamp;
        if (!editedMeanwhile) this._changed = 0;
        const savedName = data.user_filename || data.filename || opt.filename;
        // No "Saved: …" toast on autosave; the header label is the feedback.
        const browsers = [target, Wm.getActiveWindow(), Wm].filter(
          (b, i, a) => b && a.indexOf(b) === i
        );
        for (const b of browsers) {
          if (!b || !b.getItemsByAttr) continue;
          let [file] = b.getItemsByAttr(_a.nid, data.nid);
          if (file) {
            if (file.restart) {
              file.mset(data);
              file.restart("media:modified");
            }
            continue;
          }
          if (b.insertMedia) {
            const item = {
              kind: b._getKind ? b._getKind() : "media_grid",
              logicalParent: b,
              ...this.getCurrentMedia(),
              ...data,
            };
            delete item.replace;
            b.insertMedia(item, 0);
          }
        }
        this.mset(data);
        this.ensurePart("ref-window-name")
          .then((p) => {
            if (p && p.set) p.set({ content: savedName });
          })
          .catch(() => {});
        // media.save CREATES an empty node — content is only persisted on a
        // replace-save. Re-save once (now replace) to write the bytes. Clear the
        // guard first so this single legitimate follow-up is allowed through;
        // it carries the freshly adopted nid, so it REPLACES (no duplicate).
        this._saving = 0;
        if (!opt.replace) this.saveContent();
        else this.setSaveStatus(editedMeanwhile ? "unsaved" : "saved");
      })
      .catch((e) => {
        this._saving = 0;
        this.setSaveStatus("unsaved");
        this.warn("__editor_docs: save failed", e);
        const status = e && (e.status || e.error_code);
        Wm.alert(status == 403 ? LOCALE.WEAK_PRIVILEGE : LOCALE.ERROR_NETWORK);
      });
  }

  /**
   *
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    switch (service) {
      case _e.save:
      case _a.save:
        this.saveContent();
        break;
      case _e.close:
        this.goodbye();
        return;
      case "direct-rename":
        return this.renameFromChrome();
      case "toggle-doc-tabs":
        return this.toggleTabs();
      case "contact-support":
        return this.contactSupport();
      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }

  // ── Document tabs ────────────────────────────────────────────────────────
  //
  // One .udoc holds several documents, like Google Docs' "Document tabs":
  // the rail on the left lists them, the editor shows one at a time, and a
  // save writes them all (docs/tabs.js owns the on-disk shape).

  /**
   * Adopt the tab list read from the file (docs_state, on load).
   *
   * @param {Array} tabs
   * @param {String} active
   */
  setTabs(tabs, active) {
    this._tabs = Array.isArray(tabs) && tabs.length ? tabs : [];
    this._activeTab = active || (this._tabs[0] && this._tabs[0].id) || null;
    // The rail opens by itself, the way Google Docs shows it: the tabs of a
    // document are part of the document, and a rail that must be found in a
    // menu first reads as "the feature is missing". An explicit close by the
    // user is remembered for as long as the window is open.
    // The co-editing mount joins the file's original room before the list is
    // known; once it is, move to the room of the tab the file was left on.
    if (this._doc && this._doc.ensureRoomForActive) this._doc.ensureRoomForActive();
    if (this._tabs.length && !this._tabsClosedByUser && !this._tabsOpen) {
      this.toggleTabs(true);
      return;
    }
    this.renderTabs();
  }

  /** @returns {Array} the tab list, never empty once the file has loaded. */
  getTabs() {
    return this._tabs || [];
  }

  /** @returns {String|null} */
  activeTabId() {
    return this._activeTab || null;
  }

  /**
   * The JSON to store: every tab, with `base64` written into the active one.
   *
   * @param {String} base64 freshly exported bytes of the tab on screen
   */
  tabsPayload(base64) {
    const tabs = this.getTabs();
    if (!tabs.length) return { docx: base64 };
    const active = this.activeTabId();
    const merged = tabs.map((t) => (t.id === active ? { ...t, docx: base64 } : t));
    this._tabs = merged;
    return docTabs.writeTabs(merged, active);
  }

  /** Repaint the rail (no-op while it is collapsed). */
  renderTabs() {
    if (!this._tabsOpen) return;
    this.ensurePart("doc-tabs").then((p) => {
      if (!p || !p.el) return;
      p.el.innerHTML = "";
      p.el.appendChild(
        require("./skeleton/tabs-rail").build(this, this.getTabs(), this.activeTabId(), {
          loading: this._loadingTab || null,
        })
      );
    });
  }

  /**
   * Mark the row of the tab that is being opened, so a switch that has to
   * wait for its co-editing room to connect looks like work in progress
   * rather than a click that did nothing.
   *
   * @param {String|null} id
   */
  setTabLoading(id) {
    this._loadingTab = id || null;
    this.renderTabs();
  }

  /** Show / hide the rail. */
  toggleTabs(force) {
    this._tabsOpen = force == null ? !this._tabsOpen : !!force;
    // Closing it by hand means "leave it closed", even when the file has
    // several tabs (setTabs would otherwise re-open it on the next save).
    if (!this._tabsOpen) this._tabsClosedByUser = 1;
    else this._tabsClosedByUser = 0;
    if (this.el) this.el.dataset.tabs = this._tabsOpen ? "open" : "closed";
    this.renderTabs();
  }

  /**
   * Switch tabs: the bytes on screen belong to the tab we are LEAVING, so
   * they are exported and kept before the next tab is loaded — otherwise a
   * switch would drop whatever was typed since the last autosave.
   *
   * @param {String} id
   */
  async selectTab(id) {
    if (!id || id === this._activeTab) return;
    const tabs = this.getTabs();
    if (!tabs.some((t) => t.id === id)) return;
    // LAST CLICK WINS. A switch is not finished until the room has connected,
    // which takes a moment; a lock over that window swallowed the next click
    // ("click tab 2 không ăn"). Each switch takes a ticket instead, and an
    // older one that comes back late stops rather than dragging the editor
    // back to the tab the user has already left.
    const seq = (this._switchSeq = (this._switchSeq || 0) + 1);
    const current = () => seq === this._switchSeq;
    this._switchingTab = 1;
    try {
      // NOTHING is awaited before the swap. The editor of the tab being left
      // stays mounted (docs_state keeps one per visited tab), so its bytes
      // can be taken AFTER the new tab is on screen — waiting for that export
      // first is what left a click feeling slow.
      const leaving = this._activeTab;
      const leavingRef = this._doc && this._doc.currentRef ? this._doc.currentRef() : null;

      this._activeTab = id;
      this._loadingTab = id;
      this.renderTabs();
      const showing = this._doc && this._doc.showTab ? this._doc.showTab(id) : null;

      // Background: take the bytes of the tab just left, keep them in the
      // model, and write the file. Never awaited, never able to hang the UI.
      capped(
        (async () => {
          const b64 =
            this._doc && this._doc.exportFrom ? await this._doc.exportFrom(leavingRef) : null;
          if (b64) {
            this._tabs = this.getTabs().map((t) => (t.id === leaving ? { ...t, docx: b64 } : t));
          }
          await this.persistTabs();
        })(),
        10000
      );
      await capped(showing, 15000);
    } catch (e) {
      this.warn("__editor_docs: tab switch failed", e);
    } finally {
      if (current()) {
        this._switchingTab = 0;
        this.setTabLoading(null);
      }
    }
  }

  /**
   * Write the tab LIST as it stands (names, order, which one is active) with
   * each tab's stored bytes. Used around a switch, where exporting the editor
   * would capture the wrong tab.
   */
  async persistTabs() {
    const tabs = this.getTabs();
    if (!tabs.length || !this.mget(_a.nid)) return null;
    const docTabsLib = require("./tabs");
    return this.saveContent({ content: JSON.stringify(docTabsLib.writeTabs(tabs, this.activeTabId())) });
  }

  /** Export what is on screen into the active tab of the in-memory list. */
  async stashActiveTab() {
    if (!this._doc || !this._doc.exportCurrent) return null;
    const base64 = await this._doc.exportCurrent();
    if (!base64) return null;
    const active = this.activeTabId();
    this._tabs = this.getTabs().map((t) => (t.id === active ? { ...t, docx: base64 } : t));
    return base64;
  }

  /** "+" on the rail: a new, empty tab, opened straight away. */
  async addTab() {
    const tabs = this.getTabs();
    const id = docTabs.newTabId();
    this._tabs = tabs.concat([{ id, name: docTabs.defaultName(tabs.length), docx: null }]);
    await this.selectTab(id);
  }

  /**
   * Rename a tab from the rail's inline input.
   *
   * @param {String} id
   * @param {String} name
   */
  renameTab(id, name) {
    const clean = String(name || "").trim();
    if (!clean) return;
    this._tabs = this.getTabs().map((t) => (t.id === id ? { ...t, name: clean } : t));
    this.renderTabs();
    // A name change touches no document: persistTabs writes the list from the
    // model, where saveContent would export the .docx through WASM (and, in
    // co-editing, flush the autosave) for nothing.
    this.persistTabs();
  }

  /**
   * Move a tab, from the rail's drag-and-drop.
   *
   * @param {String} id     the tab being moved
   * @param {String} beforeId  the tab it lands in front of, null for the end
   */
  reorderTabs(id, beforeId) {
    if (id === beforeId) return;
    const tabs = this.getTabs();
    const moving = tabs.find((t) => t.id === id);
    if (!moving) return;
    const rest = tabs.filter((t) => t.id !== id);
    const at = beforeId ? rest.findIndex((t) => t.id === beforeId) : rest.length;
    if (at < 0) return;
    this._tabs = rest.slice(0, at).concat([moving], rest.slice(at));
    this.renderTabs();
    this.persistTabs();
  }

  /** A copy of a tab, right after it. */
  async duplicateTab(id) {
    if (id === this.activeTabId()) await this.stashActiveTab();
    const tabs = this.getTabs();
    const i = tabs.findIndex((t) => t.id === id);
    if (i < 0) return;
    const copy = {
      id: docTabs.newTabId(),
      name: `${tabs[i].name} (${LOCALE.COPY || "copy"})`,
      docx: tabs[i].docx,
    };
    this._tabs = tabs.slice(0, i + 1).concat([copy], tabs.slice(i + 1));
    await this.selectTab(copy.id);
  }

  /** Remove a tab. The last one always stays — a document needs a body. */
  async removeTab(id) {
    const tabs = this.getTabs();
    if (tabs.length < 2) return;
    const i = tabs.findIndex((t) => t.id === id);
    if (i < 0) return;
    const next = tabs[i + 1] || tabs[i - 1];
    this._tabs = tabs.filter((t) => t.id !== id);
    if (id === this.activeTabId()) {
      this._activeTab = next.id;
      this.renderTabs();
      if (this._doc && this._doc.showTab) await this._doc.showTab(next.id);
    } else {
      this.renderTabs();
    }
    // Same as a rename: the list changed, the documents did not.
    this.persistTabs();
  }

  /**
   * Gear "Rename".
   *
   * `player/widget/topbar/rename` edits the "player-title" part, and this
   * window deliberately has none — Casual's own title bar owns the name — so
   * that helper returns silently here. Focus Casual's name field instead: the
   * injected one in co-editing mode, else DocxEditor's. Both commit through
   * renameFromCasual() → media.rename, so the grid tile follows either way.
   */
  renameFromChrome() {
    const input =
      this.el.querySelector(".editor-docs__collab-name input") ||
      this.el.querySelector('input[aria-label="Document name"]') ||
      this.el.querySelector('[data-testid="title-bar"] input');
    if (!input) return renameInline(this);
    input.focus();
    try {
      input.select();
    } catch (e) {
      /** not a text input */
    }
    return null;
  }

  /**
   * Gear "Contact us" (replaces Casual's Help menu, see docs_state
   * _hideCasualHelp): open Drumee's support conversation through the desk
   * module, else the support mail link.
   */
  contactSupport() {
    const candidates = [this.parent, typeof Wm !== "undefined" ? Wm : null];
    for (let v of candidates) {
      for (let i = 0; v && i < 12; i++) {
        if (typeof v.openSupportChat === "function") return v.openSupportChat();
        v = v.parent;
      }
    }
    const { openSupportMail } = require("libs/support");
    openSupportMail();
  }
}

export default __editor_docs;
