const __player = require("player/interact");
const renameInline = require("builtins/player/widget/topbar/rename");
const { attachHelpContactMenu } = require("builtins/editor/help-contact-menu");
const { TweenMax, Expo } = require("@drumee/ui-core/vendor");

require("./skin");

class __editor_sheet extends __player {
  /**
   *
   */
  initialize(opt = {}) {
    super.initialize(opt);
    // Univer owns the right-click menu inside the sheet; keep the window from
    // walking the view tree up to the desk's menu (see sheet/state.js).
    this.escapeContextmenu = true;
    // Launch order stamp (shared with editor_docs): a delayed self-raise must
    // never pop an OLDER editor over one the user opened afterwards.
    window.__drumeeEditorSeq = (window.__drumeeEditorSeq || 0) + 1;
    this._launchSeq = window.__drumeeEditorSeq;
    window.onbeforeunload = this.checkUnsavedWork.bind(this);
    if (!opt.media) {
      /** New sheet: no source file yet, defaults to the owner's deck */
      this.mset({
        hub_id: Visitor.id,
        pid: Visitor.get(_a.home_id),
        privilege: _K.privilege.owner,
      });
      // Google-Sheets style default name; the server suffixes duplicates.
      this.model.atLeast({ filename: LOCALE.UNTITLED_SPREADSHEET });
    }
    // Save target: the folder window the sheet is created in (markdown editor
    // does the same). Opened-from-file saves replace in place and ignore it.
    this.target = opt.target || Wm.getActiveWindow();
  }

  /**
   *
   */
  onBeforeDestroy() {
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
    if (this._changed) {
      return LOCALE.CONFIRM_QUIT;
    }
  }

  /**
   * Open at the standard large editor size and let the base window handle
   * placement / clamping — mirrors the diagram editor (the other canvas
   * editor). A hand-rolled size here fought the base display()'s own fit +
   * maximize/restore bookkeeping, which made resize and maximize look wrong.
   */
  /**
   * The desk's Files folder window is a SIBLING in the same WM layer with an
   * explicit `z-index:1000`; this window's root is `auto`, so the folder paints
   * over it whenever it re-raises (after its grid loads). raise() only reorders
   * DOM, which an explicit-z sibling ignores — pin the root one notch above.
   */
  _raiseAboveDesk(force) {
    // Only the most recently launched editor may self-raise (timers); a real
    // pointerdown always may — see editor_docs for the rationale.
    if (!force && this._launchSeq !== window.__drumeeEditorSeq) return;
    try {
      if (this.el) this.el.style.zIndex = "1001";
    } catch (e) {
      /** best effort */
    }
    this.raise();
  }

  display() {
    // Open MAXIMIZED to the desk workspace, exactly like the office (document)
    // editor — which fills the whole workspace instead of a small centered
    // floating window (the "why does office open full but this doesn't" gap).
    // Bounds are set instantly (no scale tween) so Casual/Univer measures the
    // final size on first paint; a fade-in replaces the scale animation, and the
    // window keeps re-fitting when the workspace resizes.
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

  /**
   * The desk workspace rectangle in VIEWPORT coords — the area below the top
   * header and right of the left sidebar (copied from the office document
   * player so a maximized sheet fills exactly the workspace).
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
   * Workspace bounds in the window's offset-parent coordinates.
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
   * Fill the workspace. `this.size` is the CONTENT size (window minus header);
   * the element gets the full workspace rect. Re-applying resizes the sheet, so
   * Casual/Univer re-measures via its own ResizeObserver.
   */
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
    // Casual/Univer re-measures the grid from its own ResizeObserver + the
    // state widget's resize nudge — no setContentSize() (it reads content-part
    // geometry that isn't ready during the first display() and throws).
    try {
      window.dispatchEvent(new Event("resize"));
    } catch (e) {
      /** best effort */
    }
  }

  /**
   * Keep the maximized sheet filling the workspace when it resizes.
   */
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
   * @param {View} child
   * @param {String} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.content: {
        this.display();
        this.setupInteract();
        this.raise();
        let media = this.media;
        let kind = "sheet_state";
        Kind.waitFor(kind).then(() => {
          child.feed({ kind, media, editor: this });
          this._sheet = child.children.last();
        });
        break;
      }
      default:
        super.onPartReady(child, pn);
    }
  }

  /**
   * Upon DOM refresh, after element actually inserted into DOM
   */
  onDomRefresh() {
    this.feed(require("./skeleton")(this));
    this._wireTitleRename();
    this._wireHotkeys();
    this.applyTheme(this.savedTheme());
  }

  /** Last chosen look; defaults to the dark ("đen") look the demo ships. */
  savedTheme() {
    try {
      return localStorage.getItem("drumee:sheet-theme") || "dark";
    } catch (e) {
      return "dark";
    }
  }

  /**
   * Re-skin this window (title row, gear menu, rename input via
   * `[data-theme]` in the skin) and switch Casual/Univer's own appearance so
   * grid, toolbar and menus follow. Persisted so the next sheet opens the same.
   * @param {"light"|"dark"} theme
   */
  applyTheme(theme) {
    this.theme = theme === "dark" ? "dark" : "light";
    if (this.el) this.el.dataset.theme = this.theme;
    try {
      localStorage.setItem("drumee:sheet-theme", this.theme);
    } catch (e) {
      /** private mode */
    }
    if (this._sheet && this._sheet.setTheme) this._sheet.setTheme(this.theme);
  }

  /**
   * Drive the header's "All changes saved" label (part "save-status").
   * @param {"saved"|"saving"|"unsaved"} state
   */
  setSaveStatus(state) {
    const labels = {
      saved: LOCALE.ALL_CHANGES_SAVED,
      saving: LOCALE.SAVING,
      unsaved: LOCALE.UNSAVED_CHANGES,
    };
    this._saveState = state;
    if (!this.ensurePart) return;
    this.ensurePart("save-status")
      .then((p) => {
        if (!p || !p.el || p.isDestroyed()) return;
        if (p.set) p.set({ content: labels[state] || labels.saved });
        // Note.set() re-renders and drops anything stamped on the old el.
        const stamp = () => {
          if (p.el && !p.isDestroyed()) p.el.dataset.state = state;
        };
        stamp();
        setTimeout(stamp, 0);
      })
      .catch(() => {});
  }

  /** Called by sheet_state on every real edit: mark dirty + show "Unsaved". */
  markDirty() {
    this._changed = 1;
    if (this._saveState !== "saving") this.setSaveStatus("unsaved");
  }

  /**
   * Ctrl/Cmd+S saves IMMEDIATELY (capture phase on the window element, so it
   * wins over the browser's "Save page" dialog and Univer's own handler).
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
    // Help menu. See builtins/editor/help-contact-menu.
    const isHelp = (t) => !!(t && t.closest && t.closest('[data-testid="cs-menu-help"]'));
    this._closeHelpMenu = attachHelpContactMenu(this, isHelp);
    this.el.addEventListener(
      "keydown",
      (e) => {
        if ((e.ctrlKey || e.metaKey) && !e.altKey && String(e.key).toLowerCase() === "s") {
          e.preventDefault();
          e.stopPropagation();
          this.saveContent();
        }
      },
      true
    );
  }

  /**
   * Make the header filename click-to-edit inline (like the standalone tab),
   * instead of only via the gear → Rename. Reuses the same renameInline helper.
   */
  _wireTitleRename() {
    if (!this.ensurePart) return;
    this.ensurePart("player-title")
      .then((p) => {
        if (!p || !p.el || p._renameWired) return;
        p._renameWired = 1;
        p.el.classList.add("editor-sheet__editable-title");
        p.el.addEventListener("click", (e) => {
          // Don't let the click bubble to the identity block's raise handler.
          e.stopPropagation();
          renameInline(this);
        });
      })
      .catch(() => {});
  }

  /**
   *
   */
  getCurrentMedia() {
    if (this.target) {
      return {
        pid: this.target.getCurrentNid(),
        hub_id: this.target.mget(_a.hub_id),
      };
    }
    return {
      hub_id: Visitor.id,
      pid: Visitor.get(_a.home_id),
    };
  }

  /**
   *
   */
  saveContent() {
    if (!this._sheet || !this._sheet.getSnapshot) return;
    // Reentrancy guard: autosave + Ctrl+S can overlap; a second save racing the
    // create→adopt-nid→replace sequence would spawn a duplicate file.
    if (this._saving) return;
    let snapshot = this._sheet.getSnapshot();
    if (!snapshot) return;
    this._saving = 1;
    this.setSaveStatus("saving");
    const content = JSON.stringify(snapshot);

    // `.usheet` groups the file under "Spreadsheet" with the xls glyph (the grid
    // listing drops dataType, so the extension is the reliable marker).
    const ext = this.mget(_a.ext) || "usheet";
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
      metadata: {
        dataType: "sheet.univer",
      },
    };

    let target = this.target;
    if (this.media && this.media.logicalParent) {
      target = this.media.logicalParent;
    }

    if (!replace && this.target) {
      opt = { ...opt, ...this.getCurrentMedia() };
      // A NEW file has no nid, so media.save's ACL authorizes the destination via
      // `p` (the parent folder). Without it the ACL defaults to the hub HOME —
      // which a member/DMZ recipient can't write → 403 (same trap the markdown
      // editor documents). Send the destination folder as `p`.
      opt.p = opt.pid;
      if (!this.target.canUpload || this.target.canUpload()) {
        return this._saveContent(opt, this.target);
      }
      // No write permission on the folder → fall back to the owner's deck
      opt.hub_id = Visitor.get(_a.id);
      opt.pid = Visitor.get(_a.home_id);
      opt.p = opt.pid;
      return this._saveContent(opt, Wm);
    }
    this._saveContent(opt, target);
  }

  /**
   *
   */
  _saveContent(opt, target) {
    this.postService(opt, { async: 1 })
      .then((data) => {
        if (!data || !data.nid) {
          this.warn("__editor_sheet: save returned no node", data);
          this._saving = 0;
          this.setSaveStatus("unsaved");
          return;
        }
        this._changed = 0;
        // Tell the user it actually saved, and to where — the file lands in the
        // current folder but the tile does not always refresh in, so a silent
        // ack looked like nothing happened ("sao ko lưu vào").
        const savedName = data.user_filename || data.filename || opt.filename;
        // No "Saved: …" toast: with autosave it popped every few seconds
        // ("cứ hiện save popup"). The header label ("All changes saved") is
        // the feedback now.
        // Make the saved file show up in the folder grid immediately (so it can
        // be reopened) whether the active view is a folder window or the WM.
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
        // Adopt the saved node so the next Save REPLACES this file instead of
        // creating a duplicate, and refresh the title bar with the real name.
        this.mset(data);
        this.ensurePart("ref-window-name").then((p) => {
          if (p && p.set) p.set({ content: savedName });
        }).catch(() => {});
        // media.save CREATES an empty node — inline content is only persisted on
        // a replace-save. So after adopting the new nid, save once more (now a
        // replace) to actually write the content; otherwise the file reopens
        // blank. The follow-up has an nid → replace:1 → no further follow-up.
        // Clear the guard first so the single legitimate follow-up (which now
        // carries the adopted nid → REPLACE) is allowed through.
        this._saving = 0;
        if (!opt.replace) {
          this.saveContent();
        } else {
          this.setSaveStatus("saved");
        }
      })
      .catch((e) => {
        this._saving = 0;
        this.setSaveStatus("unsaved");
        this.warn("__editor_sheet: save failed", e);
        const status = e && (e.status || e.error_code);
        Wm.alert(status == 403 ? LOCALE.WEAK_PRIVILEGE : LOCALE.ERROR_NETWORK);
      });
  }

  /**
   * Window services. Formatting/formula/insert/undo all live in Univer's own
   * native toolbar now (no hand-rolled toolbar), so this only wires the Drumee
   * window chrome: the floppy Save (→ media.save) and Close.
   * @param {View} cmd
   * @param {Object} args
   */
  /**
   * Co-editing presence (from sheet_state's awareness): initials avatars
   * next to the Live badge; click → popover listing everyone in the room.
   */
  setPeers(peers) {
    const status = this.el && this.el.querySelector(".editor-sheet__save-status");
    if (!status || !status.parentElement) return;
    let box = this._presenceBox;
    if (!box) {
      box = document.createElement("div");
      box.className = "editor-sheet__presence";
      box.addEventListener("click", (e) => {
        e.stopPropagation();
        this._togglePeersPopover(box);
      });
      this._presenceBox = box;
    }
    if (box.parentElement !== status.parentElement) status.parentElement.insertBefore(box, status);
    this._peers = Array.isArray(peers) ? peers : [];
    const initials = (n) =>
      String(n || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0] || "")
        .join("")
        .toUpperCase();
    box.innerHTML = "";
    for (const p of this._peers.slice(0, 3)) {
      const a = document.createElement("span");
      a.className = "editor-sheet__avatar";
      a.style.background = p.color || "#888";
      a.title = p.name;
      a.textContent = initials(p.name);
      box.appendChild(a);
    }
    if (this._peers.length > 3) {
      const more = document.createElement("span");
      more.className = "editor-sheet__avatar editor-sheet__avatar--more";
      more.textContent = `+${this._peers.length - 3}`;
      box.appendChild(more);
    }
    box.style.display = this._peers.length ? "" : "none";
  }

  _togglePeersPopover(anchor) {
    if (this._peersPop) {
      this._peersPop.remove();
      this._peersPop = null;
      document.removeEventListener("pointerdown", this._peersPopOutside, true);
      return;
    }
    const peers = this._peers || [];
    const pop = document.createElement("div");
    pop.className = "editor-sheet__peers-pop";
    const title = document.createElement("div");
    title.className = "editor-sheet__peers-title";
    title.textContent = `${LOCALE.ONLINE} (${peers.length})`;
    pop.appendChild(title);
    for (const p of peers) {
      const row = document.createElement("div");
      row.className = "editor-sheet__peers-row";
      const dot = document.createElement("span");
      dot.className = "editor-sheet__peers-dot";
      dot.style.background = p.color || "#888";
      const name = document.createElement("span");
      name.textContent = p.isLocal ? `${p.name} (${LOCALE.YOU})` : p.name;
      row.appendChild(dot);
      row.appendChild(name);
      pop.appendChild(row);
    }
    const hr = this.el.getBoundingClientRect();
    const ar = anchor.getBoundingClientRect();
    pop.style.top = `${Math.round(ar.bottom - hr.top + 6)}px`;
    pop.style.right = `${Math.round(hr.right - ar.right)}px`;
    this.el.appendChild(pop);
    this._peersPop = pop;
    this._peersPopOutside = (e) => {
      if (!pop.contains(e.target) && !anchor.contains(e.target)) this._togglePeersPopover(anchor);
    };
    document.addEventListener("pointerdown", this._peersPopOutside, true);
  }

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
      // Gear-menu Rename — inline-edit the title (the "player-title" part),
      // committing via SERVICE.media.rename. Same helper the office player uses.
      case "direct-rename":
        return renameInline(this);
      case "toggle-theme":
        return this.applyTheme(this.theme === "dark" ? "light" : "dark");
      case "contact-support":
        return this.contactSupport();
      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }

  /**
   * Gear "Contact us" (replaces Casual's Help menu): open Drumee's support
   * conversation through the desk module, else the support mail link.
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

export default __editor_sheet;
