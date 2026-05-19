/**
 * Google Drive migration popup
 *
 * Asks the user for a Google Drive folder ID (optional — defaults to "root"
 * = entire My Drive) and triggers google_drive.import_directory against the
 * current Drumee destination (hub_id/nid passed in by opener).
 *
 * OAuth precondition is not handled here: if the user hasn't linked their
 * Google account, the backend throws and we surface the error message.
 */
class __migrate_gdrive_popup extends LetcBox {
  constructor(...args) {
    super(...args);
    this.onDomRefresh = this.onDomRefresh.bind(this);
    this.onPartReady = this.onPartReady.bind(this);
    this.onUiEvent = this.onUiEvent.bind(this);
  }

  static initClass() {
    require("./skin");
  }

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this._hub_id = opt.hub_id || Visitor.id;
    this._nid = opt.nid || Visitor.get(_a.home_id);
    this._destinationName = opt.destinationName || LOCALE.MY_HOME || "My home";
  }

  onDomRefresh() {
    this.feed(require("./skeleton")(this));
    this.el.dataset.state = 1;
    if (this.parent && this.parent.el) {
      this._wrapperEl = this.parent.el;
      this._wrapperEl.dataset.state = "open";
      this._wrapperEl.dataset.overlay = "blur";
    }
  }

  onBeforeDestroy() {
    if (this._wrapperEl) {
      this._wrapperEl.dataset.state = "closed";
      delete this._wrapperEl.dataset.overlay;
    }
  }

  onPartReady(child, pn) {
    if (pn === "folder-id-input") {
      this._folderInput = child;
    } else if (pn === "submit-btn") {
      this._submitBtn = child;
    } else if (pn === "status") {
      this._statusBox = child;
    }
  }

  _closePopup() {
    if (this.parent && _.isFunction(this.parent.clear)) {
      this.parent.clear();
    } else {
      this.softDestroy();
    }
  }

  _getFolderId() {
    const inputEl = this._folderInput?.el?.querySelector("input");
    const raw = (inputEl?.value || "").trim();
    return raw || "root";
  }

  _setBusy(busy) {
    if (this._submitBtn) {
      this._submitBtn.el.dataset.state = busy ? 0 : 1;
      this._submitBtn.el.dataset.busy = busy ? 1 : 0;
    }
    if (this.el) this.el.dataset.busy = busy ? 1 : 0;
  }

  _setStatus(msg, kind) {
    if (!this._statusBox) return;
    this._statusBox.el.dataset.kind = kind || "";
    this._statusBox.el.dataset.state = msg ? 1 : 0;
    this._statusBox.el.textContent = msg || "";
  }

  // The framework catches non-200 responses and routes them through
  // onServerComplain instead of rejecting the postService promise — so
  // .then() receives `undefined` and `.catch()` never fires. Capture the
  // reason here so _startMigration can surface it.
  async onServerComplain(err) {
    let reason = "";
    if (err && typeof err.json === "function") {
      try {
        const body = await err.json();
        reason = (body && (body.reason || body.error)) || "";
      } catch (e) { /* body wasn't JSON */ }
    } else if (err && typeof err === "object") {
      reason = err.reason || err.error || err.message || "";
    }
    this._lastServerError = reason || LOCALE.TRY_AGAIN || "Try again";
    this._setBusy(false);
    this._running = 0;
    this._setStatus(this._lastServerError, "error");
  }

  _startMigration() {
    if (this._running) return;
    if (!this._nid) {
      this._setStatus(LOCALE.TRY_AGAIN || "Try again", "error");
      return;
    }
    this._running = 1;
    this._lastServerError = null;
    this._setBusy(true);
    this._setStatus(LOCALE.MIGRATION_IN_PROGRESS || "Migration in progress. This may take several minutes…", "info");

    const folder_id = this._getFolderId();
    this.postService("google_drive.import_directory", {
      hub_id: this._hub_id,
      nid: this._nid,
      folder_id,
    }).then((data) => {
      // onServerComplain already populated status + reset state.
      if (this._lastServerError) return;
      // 200 with embedded error payload (rare but possible).
      if (data && (data.error || data.error_code)) {
        const reason = data.reason || data.error || LOCALE.TRY_AGAIN;
        this._setStatus(reason, "error");
        this._setBusy(false);
        this._running = 0;
        return;
      }
      if (!data) {
        // No data and no captured error — bail without claiming success.
        this._setStatus(LOCALE.TRY_AGAIN || "Try again", "error");
        this._setBusy(false);
        this._running = 0;
        return;
      }
      const folders = data.folders || 0;
      const files = data.files || 0;
      const skipped = data.skipped || 0;
      const errors = data.errors || [];
      const summary = (LOCALE.MIGRATION_SUCCESS_SUMMARY
        || "Imported {0} files in {1} folders ({2} skipped, {3} errors).")
        .format(files, folders, skipped, errors.length);
      if (Wm && _.isFunction(Wm.alert)) Wm.alert(summary);
      this.triggerHandlers({ service: "migration-complete", stats: data });
      this._closePopup();
    }).catch((e) => {
      this.warn("[migrate-gdrive] import_directory failed", e);
      const reason = (e && (e.reason || e.error || e.message)) || LOCALE.TRY_AGAIN;
      this._setStatus(reason, "error");
      this._setBusy(false);
      this._running = 0;
    });
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      case "close-migrate-popup":
        if (this._running) return;
        return this._closePopup();

      case "start-migration":
        return this._startMigration();
    }
  }
}

__migrate_gdrive_popup.initClass();
module.exports = __migrate_gdrive_popup;
