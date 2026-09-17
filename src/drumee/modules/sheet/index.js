// ==================================================================== *
//   FILE : src/drumee/modules/sheet
//   TYPE : Router module — standalone full-page spreadsheet
// ==================================================================== *

require("./skin");

/**
 * Opens a Casual Sheets editor in its OWN browser tab (no desk chrome), styled
 * like the Casual demo — a slim top bar (logo + inline-editable filename +
 * save-status + dark toggle + Share) over the full-page editor. The editor and
 * its File/Edit/… menus come from the SDK's `chrome:'full'`; the top bar is our
 * own (the SDK does not ship the demo app's shell).
 *
 * Reached at:
 *   #/sheet?nid=<nid>&hub_id=<hub>   → open an existing .json sheet
 *   #/sheet?pid=<folder>&hub_id=<hub> → a new sheet, saved into that folder
 *
 * Reuses the portable `sheet_state` widget (Casual/Univer + getSnapshot) and
 * supplies its own Save (media.save). Auth is the shared session cookie.
 */
class __module_sheet extends LetcBox {
  /**
   *
   */
  onDomRefresh() {
    const args = Visitor.parseModuleArgs() || {};
    this._nid = args.nid ? decodeURIComponent(args.nid) : null;
    this._hub_id = args.hub_id
      ? decodeURIComponent(args.hub_id)
      : Visitor.get(_a.id);
    this._pid = args.pid
      ? decodeURIComponent(args.pid)
      : Visitor.get(_a.home_id);
    this._appearance = "light";
    this._displayName = "Untitled";

    window.onbeforeunload = () =>
      this._changed ? LOCALE.CONFIRM_QUIT || "" : undefined;

    this._buildTopbar();
    this._bindKeys();

    if (this._nid) {
      this.fetchService(SERVICE.media.node_info, {
        nid: this._nid,
        hub_id: this._hub_id,
      })
        .then((r) => {
          this._meta = r || {};
          // Use the file's REAL parent for replace-saves. Opening via
          // #/sheet?nid=… carries no pid, so this._pid had defaulted to the
          // user's home — and media.save(replace) with a mismatched pid failed
          // server-side and wrote 0 bytes ("saved but empty on reopen").
          if (this._meta.pid) this._pid = this._meta.pid;
          const full = this._meta.user_filename || this._meta.filename || "";
          this._displayName = full.replace(/\.[^.]+$/, "") || "Untitled";
          this._setDisplayName(this._displayName);
          const m = new Backbone.Model(r);
          return Kind.waitFor(_a.media).then((k) => {
            this._feedSheet(new k({ model: m }));
          });
        })
        .catch((e) => {
          this.warn("module_sheet: node_info failed, starting empty", e);
          this._meta = {};
          this._feedSheet(null);
        });
      return;
    }
    // Brand-new sheet.
    this._meta = {};
    this._setDisplayName("Untitled");
    this._feedSheet(null);
  }

  /**
   * The demo-style top bar: logo + inline filename + status + dark + Share.
   */
  _buildTopbar() {
    const bar = document.createElement("div");
    bar.className = "module-sheet__topbar";

    // Brand (logo) + editable filename.
    const brand = document.createElement("div");
    brand.className = "module-sheet__brand";
    const logo = document.createElement("div");
    logo.className = "module-sheet__logo";
    // Green rounded tile with a header row + column/row grid — reads as a sheet.
    logo.innerHTML =
      '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">' +
      '<rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="#188038"/>' +
      '<path d="M2.5 8.75h19" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="M9 8.75v12.75M15 8.75v12.75" stroke="#fff" stroke-width="1.1" stroke-linecap="round" opacity="0.75"/>' +
      '<path d="M2.5 15h19" stroke="#fff" stroke-width="1.1" stroke-linecap="round" opacity="0.75"/>' +
      "</svg>";

    // Editable document title (input + subtle pencil affordance on hover).
    const title = document.createElement("div");
    title.className = "module-sheet__title";
    const name = document.createElement("input");
    name.className = "module-sheet__name";
    name.type = "text";
    name.spellcheck = false;
    name.value = this._displayName;
    name.setAttribute("aria-label", "Filename");
    name.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        name.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        name.value = this._displayName;
        name.blur();
      }
    });
    name.addEventListener("blur", () => this._renameFile(name.value));
    name.addEventListener("focus", () => name.select());
    this._nameInput = name;
    const hint = document.createElement("span");
    hint.className = "module-sheet__edit-hint";
    hint.setAttribute("aria-hidden", "true");
    hint.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 20h9"/>' +
      '<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>' +
      "</svg>";
    title.append(name, hint);
    brand.append(logo, title);

    // Save status pill.
    const status = document.createElement("span");
    status.className = "module-sheet__status";
    status.textContent = "";
    this._statusEl = status;
    brand.append(status);

    // Right actions.
    const actions = document.createElement("div");
    actions.className = "module-sheet__actions";

    const share = document.createElement("button");
    share.className = "module-sheet__btn module-sheet__btn--share";
    share.type = "button";
    // Share-nodes icon + label (label kept as a text node after the icon).
    share.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' +
      '<circle cx="18" cy="5" r="3"/>' +
      '<circle cx="6" cy="12" r="3"/>' +
      '<circle cx="18" cy="19" r="3"/>' +
      '<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>' +
      '<line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>' +
      "</svg>";
    share.append(document.createTextNode(LOCALE.SHARE || "Share"));
    share.addEventListener("click", () => this._share());

    const dark = document.createElement("button");
    dark.className = "module-sheet__btn module-sheet__btn--icon";
    dark.type = "button";
    dark.title = "Toggle dark mode";
    dark.setAttribute("aria-label", "Toggle dark mode");
    // The glyph is hidden by CSS (font-size:0); the crisp moon/sun is drawn as
    // a masked ::before that swaps on [data-theme]. The JS keeps owning this
    // textContent, so the theme logic is untouched.
    dark.textContent = "☽"; // moon
    dark.addEventListener("click", () => this._toggleDark(dark));

    actions.append(share, dark);
    bar.append(brand, actions);
    this.el.appendChild(bar);
    this._topbar = bar;
  }

  /**
   *
   */
  _setDisplayName(name) {
    this._displayName = name || "Untitled";
    if (this._nameInput && document.activeElement !== this._nameInput) {
      this._nameInput.value = this._displayName;
    }
    document.title = `${this._displayName} — Spreadsheet`;
  }

  /**
   * @param {String} raw new base name (no extension)
   */
  _renameFile(raw) {
    let next = (raw || "").trim().replace(/\//g, "-");
    if (!next) {
      this._setDisplayName(this._displayName); // revert empty
      return;
    }
    if (next === this._displayName) return;
    this._setDisplayName(next);
    // Rename the stored file in place (only if it already exists).
    const nid = this._nid || (this._meta && this._meta.nid);
    if (!nid) return; // new sheet — name is used on first save
    const ext = (this._meta && this._meta.ext) || "json";
    this.postService(SERVICE.media.rename, {
      service: SERVICE.media.rename,
      nid,
      hub_id: this._hub_id,
      filename: `${next}.${ext}`,
    })
      .then((r) => {
        if (r) this._meta = { ...this._meta, ...r };
      })
      .catch((e) => this.warn("module_sheet: rename failed", e));
  }

  /**
   * @param {HTMLElement} btn
   */
  _toggleDark(btn) {
    this._appearance = this._appearance === "dark" ? "light" : "dark";
    const api = this._sheet && this._sheet._apiHandle;
    try {
      if (api && typeof api.setTheme === "function") api.setTheme(this._appearance);
    } catch (e) {
      /** best effort */
    }
    document.documentElement.dataset.theme = this._appearance;
    if (btn) btn.textContent = this._appearance === "dark" ? "☀" : "☽";
  }

  /**
   * Copy a link to this sheet (a real share ties into Drumee sharing later).
   */
  _share() {
    const url = location.href;
    try {
      navigator.clipboard.writeText(url);
      this._flashSaved("Link copied");
    } catch (e) {
      this._flashSaved(url, 0);
    }
  }

  /**
   * @param {View|null} media
   */
  _feedSheet(media) {
    this.media = media;
    Kind.waitFor("sheet_state").then(() => {
      this.feed({ kind: "sheet_state", media, editor: this });
      this._sheet = this.children.last();
      if (this._sheet && this._sheet.el) {
        this._sheet.el.classList.add("module-sheet__editor");
      }
    });
  }

  /**
   *
   */
  _bindKeys() {
    this._onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        this.saveContent();
      }
    };
    window.addEventListener("keydown", this._onKey, true);
  }

  /**
   * Reflect the dirty/saved state in the top-bar pill. Called by sheet_state
   * (`editor._changed = 1` on edits) is not enough — set the pill from here.
   */
  _setStatus(text) {
    if (this._statusEl) this._statusEl.textContent = text || "";
  }

  /**
   * Persist the workbook. Called by sheet_state (Casual File→Save / Ctrl+S via
   * state.js onSave) and our own Ctrl+S.
   */
  saveContent() {
    if (this._saving) return;
    if (!this._sheet || !this._sheet.getSnapshot) return;
    const snapshot = this._sheet.getSnapshot();
    if (!snapshot) return;

    const meta = this._meta || {};
    // `.usheet` is the dedicated Univer-sheet extension — it's the reliable
    // tile-level marker (the grid listing drops dataType/metadata) that groups
    // the file under "Spreadsheet", gives it the xls glyph, and reopens it in a
    // tab. Existing files keep their stored extension.
    const ext = meta.ext || "usheet";
    const base = (this._displayName || "Untitled").replace(/\//g, "-");

    const nid = this._nid || meta.nid;
    const replace = nid ? 1 : 0;
    const wasNew = !replace;
    const opt = {
      service: SERVICE.media.save,
      hub_id: this._hub_id,
      nid,
      id: nid,
      replace,
      pid: this._pid,
      filename: `${base}.${ext}`,
      content: JSON.stringify(snapshot),
      metadata: { dataType: "sheet.univer" },
    };
    if (!replace) opt.p = this._pid;

    this._saving = 1;
    this._setStatus("Saving…");
    this.postService(opt, { async: 1 })
      .then((data) => {
        this._saving = 0;
        if (data && data.nid) {
          this._nid = data.nid;
          this._meta = { ...this._meta, ...data };
        }
        this._changed = 0;
        // media.save CREATES the node but writes an EMPTY file (inline content
        // is only persisted on a replace-save). So immediately re-save the new
        // node as a replace to actually write the content — otherwise the file
        // reopens blank ("sửa rồi lưu, mở lên ko có nội dung"). The follow-up
        // has an nid → replace:1 → wasNew false, so it does not recurse.
        if (wasNew && data && data.nid) {
          this.saveContent();
          return;
        }
        this._setStatus("Saved");
        clearTimeout(this._statusT);
        this._statusT = setTimeout(() => this._setStatus(""), 1500);
      })
      .catch((e) => {
        this._saving = 0;
        this.warn("module_sheet: save failed", e);
        this._setStatus("Save failed");
      });
  }

  /**
   * A tiny toast (no Wm here).
   */
  _flashSaved(msg, isError) {
    try {
      let t = this._toast;
      if (!t) {
        t = document.createElement("div");
        t.className = "module-sheet__toast";
        document.body.appendChild(t);
        this._toast = t;
      }
      t.textContent = msg;
      t.dataset.error = isError ? "1" : "0";
      t.dataset.show = "1";
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => {
        t.dataset.show = "0";
      }, 1600);
    } catch (e) {
      /** best-effort */
    }
  }

  /**
   *
   */
  onBeforeDestroy() {
    try {
      window.removeEventListener("keydown", this._onKey, true);
    } catch (e) {
      /** already gone */
    }
    if (this._toast && this._toast.parentElement) {
      this._toast.parentElement.removeChild(this._toast);
    }
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }
}

module.exports = __module_sheet;
