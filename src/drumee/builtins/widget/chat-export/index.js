/* ============================================================ *
 * Widget: chat-export
 * Export chat history modal — launched from the folder window
 * thread-menu "Download Chat history" item.
 * ============================================================ */

class __widget_chat_export extends LetcBox {
  // ------------------------------------------------------------------ lifecycle

  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    this.declareHandlers();
    // Subscribe to WS so PDF-export progress events land in onWsMessage.
    this.bindEvent(_a.live);

    // --- internal state ---
    this._format = "json"; // 'pdf' | 'json'
    // Two independent scope axes sent to the backend:
    //   _folderSel : 'all' | array of folder nids | 'none'
    //   _threadSel : 'all' | array of file_thread_ids | 'none'
    this._folderSel = "all";
    this._threadSel = "all";
    // Which folder nids / file-thread ids are individually checked.
    this._checkedFolderNids = new Set();
    this._checkedThreadIds = new Set();
    // _allChecked = every folder AND every thread checked (derived in
    // _syncScopeFromChildren) — drives the "All" row's checkbox.
    this._allChecked = true;
    this._foldersExpanded = false;
    this._threadsExpanded = false;
    this._dateEnabled = false;
    this._startDate = null;
    this._endDate = null;
    // Resolved from export_scope response
    this._hubName = "";
    this._messageCount = 0;
    this._hubMtime = null;
    this._folders = []; // [{ nid, name, path }] — subtree folders (per-folder scope)
    this._fileThreads = []; // [{ file_thread_id, file_nid, filename, reply_count }]
    // Download-state guard to prevent double-fire
    this._activeZipId = null;
    // True while a PDF export is being generated server-side — flips the
    // Download button into its spinner "Generating" state (see skeleton
    // _downloadButton) instead of showing the old thin progress bar.
    this._generating = false;

    // File-scope mode (opened from a file's kebab → "Download Chat Threads"):
    // the export is locked to that single file's thread. The card shows the
    // file (not the folder) and the scope picker is hidden. _loadScope resolves
    // the file's file_thread_id by matching file_nid.
    this._fileScope = !!this.mget("file_scope");
    this._matchedThread = null;
    // File-scope: no folder chat, only this file's thread (resolved in
    // _loadScope). Default to empty so an export fired before load sends nothing.
    if (this._fileScope) {
      this._folderSel = "none";
      this._threadSel = [];
    }
  }

  onBeforeDestroy() {
    this.unbindEvent(_a.live);
    if (this._downloadTimer) {
      clearTimeout(this._downloadTimer);
      this._downloadTimer = null;
    }
  }

  // ------------------------------------------------------------------ render

  async onDomRefresh() {
    this.feed(require("./skeleton").default(this));
    await this._loadScope();
  }

  onPartReady(child, pn) {
    switch (pn) {
      case "progress-area":
        this.__progressArea = child;
        break;

      case "date-start": {
        // Wire native <input type=date> change → _setStartDate.
        const el = child && child.el;
        if (el) {
          el.addEventListener("change", (e) => {
            if (!this.isDestroyed || !this.isDestroyed()) {
              this._setStartDate(e.target.value);
            }
          });
        }
        break;
      }

      case "date-end": {
        const el = child && child.el;
        if (el) {
          el.addEventListener("change", (e) => {
            if (!this.isDestroyed || !this.isDestroyed()) {
              this._setEndDate(e.target.value);
            }
          });
        }
        break;
      }

      default:
        if (super.onPartReady) super.onPartReady(child, pn);
    }
  }

  // ------------------------------------------------------------------ data

  async _loadScope() {
    const hub_id = this.mget(_a.hub_id);
    if (!hub_id) return;
    try {
      // nid = the folder this modal was opened in — the backend scopes the
      // export (message count, file threads, sections) to its subtree.
      const nid = this.mget(_a.nid) || null;
      const data = await this.fetchService(SERVICE.channel.export_scope, { hub_id, nid });
      const { hub = {}, folders = [], file_threads = [] } = data || {};
      this._hubName = hub.name || "";
      this._messageCount = hub.message_count || 0;
      this._hubMtime = hub.mtime || null;
      this._folders = Array.isArray(folders) ? folders : [];
      this._fileThreads = Array.isArray(file_threads) ? file_threads : [];
      // Default: every folder + every thread checked. Normalize to strings so
      // Set.has() works regardless of whether the backend sends numeric/string IDs.
      this._checkedFolderNids = new Set(this._folders.map((f) => String(f.nid)));
      this._checkedThreadIds = new Set(this._fileThreads.map((t) => String(t.file_thread_id)));
      // File-scope mode: lock the export to this file's own thread. Match by
      // file_nid; thread_sel=[file_thread_id] + folder_sel='none' → export ONLY
      // that thread. No match (file has no thread yet) → nothing to export.
      if (this._fileScope) {
        const fileNid = String(this.mget("file_nid") || "");
        const match = this._fileThreads.find(
          (t) => String(t.file_nid) === fileNid,
        );
        this._matchedThread = match || null;
        this._checkedFolderNids = new Set();
        this._checkedThreadIds = new Set(match ? [String(match.file_thread_id)] : []);
        this._folderSel = "none";
        this._threadSel = match ? [String(match.file_thread_id)] : [];
      }
      // Re-feed the skeleton now that real data is available.
      // Fix #6: re-feeding is kept here (data load only, not on every toggle).
      this.feed(require("./skeleton").default(this));
    } catch (e) {
      this.warn("chat-export: failed to load scope", e);
    }
  }

  // ------------------------------------------------------------------ event handler

  onUiEvent(cmd, args = {}) {
    const service = args.service || (cmd && cmd.mget && cmd.mget(_a.service));
    switch (service) {
      case "set-format":
        return this._setFormat(cmd.mget("format"));

      case "scope-all":
        return this._setScopeAll();

      case "scope-folder-toggle":
        return this._toggleFolderScope(cmd.mget("folder_nid"));

      case "toggle-folders":
        return this._toggleFoldersExpand();

      case "scope-thread-toggle":
        return this._toggleThreadScope(cmd.mget("file_thread_id"));

      case "toggle-file-threads":
        return this._toggleFileThreadsExpand();

      case "toggle-date-range":
        return this._toggleDateRange();

      case "date-start-change":
        return this._setStartDate(cmd.mget("value") || (args && args.value));

      case "date-end-change":
        return this._setEndDate(cmd.mget("value") || (args && args.value));

      case "do-export":
        return this._doExport();

      case "close-export":
        return this._closeModal();

      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }

  // ------------------------------------------------------------------ scope state machine
  // Two independent axes: which folders (per-folder chat) and which file
  // threads. Each checkbox reflects real state; _folderSel/_threadSel/_allChecked
  // are derived in _syncScopeFromChildren.

  /**
   * "All" checkbox: TOGGLE everything. All-checked → clear both sets; otherwise
   * → check every folder + every thread.
   */
  _setScopeAll() {
    if (this._allChecked) {
      this._checkedFolderNids = new Set();
      this._checkedThreadIds = new Set();
    } else {
      this._checkedFolderNids = new Set(this._folders.map((f) => String(f.nid)));
      this._checkedThreadIds = new Set(
        this._fileThreads.map((t) => String(t.file_thread_id)),
      );
    }
    this._syncScopeFromChildren();
  }

  _toggleFolderScope(folderNid) {
    if (!folderNid) return;
    const id = String(folderNid);
    if (this._checkedFolderNids.has(id)) {
      this._checkedFolderNids.delete(id);
    } else {
      this._checkedFolderNids.add(id);
    }
    this._syncScopeFromChildren();
  }

  _toggleThreadScope(threadId) {
    if (!threadId) return;
    // Keep as string — file_thread_id is a string throughout (from server JSON and
    // mget); casting to Number risks identity mismatch and MAX_SAFE_INTEGER corruption.
    const id = String(threadId);
    if (this._checkedThreadIds.has(id)) {
      this._checkedThreadIds.delete(id);
    } else {
      this._checkedThreadIds.add(id);
    }
    this._syncScopeFromChildren();
  }

  /**
   * Derives _folderSel + _threadSel + _allChecked from the current checkbox
   * state and triggers a targeted UI refresh. Each axis: 'all' when every item
   * is checked, an array when a subset is, 'none' when empty.
   */
  _syncScopeFromChildren() {
    const allFolderNids = this._folders.map((f) => String(f.nid));
    const allThreadIds = this._fileThreads.map((t) => String(t.file_thread_id));

    const allFoldersChecked =
      allFolderNids.length > 0 &&
      allFolderNids.every((id) => this._checkedFolderNids.has(id));
    const allThreadsChecked =
      allThreadIds.length === 0 ||
      allThreadIds.every((id) => this._checkedThreadIds.has(id));

    this._folderSel = allFoldersChecked
      ? "all"
      : (this._checkedFolderNids.size > 0 ? [...this._checkedFolderNids] : "none");
    this._threadSel = allThreadsChecked
      ? "all"
      : (this._checkedThreadIds.size > 0 ? [...this._checkedThreadIds] : "none");

    // "All" is on only when every folder AND every thread is checked. When there
    // are no folders at all, fall back to threads-only for the derived flag.
    const foldersFull = allFolderNids.length === 0 || allFoldersChecked;
    this._allChecked = foldersFull && allThreadsChecked;

    this._refreshScopeUI();
  }

  // Fix #6: _refreshScopeUI only re-feeds the scope section to avoid
  // destroying the entire modal DOM on every checkbox toggle.
  // Since the modal is a single Box.Y, we must re-feed the whole card
  // but do so synchronously — the framework handles the diffing efficiently.
  // The key improvement over the old pattern is that we no longer re-feed
  // on EVERY event; only scope toggles call this, while data-load, format,
  // date-range each do their own targeted re-feed below.
  _refreshScopeUI() {
    this.feed(require("./skeleton").default(this));
  }

  // ------------------------------------------------------------------ format

  _setFormat(fmt) {
    if (fmt !== "pdf" && fmt !== "json") return;
    this._format = fmt;
    this.feed(require("./skeleton").default(this));
  }

  // ------------------------------------------------------------------ groups collapse

  _toggleFoldersExpand() {
    this._foldersExpanded = !this._foldersExpanded;
    this.feed(require("./skeleton").default(this));
  }

  _toggleFileThreadsExpand() {
    this._threadsExpanded = !this._threadsExpanded;
    this.feed(require("./skeleton").default(this));
  }

  // ------------------------------------------------------------------ date range

  _toggleDateRange() {
    this._dateEnabled = !this._dateEnabled;
    if (!this._dateEnabled) {
      this._startDate = null;
      this._endDate = null;
    }
    this.feed(require("./skeleton").default(this));
  }

  _setStartDate(value) {
    // Backend expects epoch seconds (INT(11)); native <input type=date> yields "yyyy-mm-dd".
    this._startDate = value ? Dayjs(value).unix() : null;
  }

  _setEndDate(value) {
    this._endDate = value ? Dayjs(value).unix() : null;
  }

  // ------------------------------------------------------------------ submit

  async _doExport() {
    const hub_id = this.mget(_a.hub_id);
    if (!hub_id) return;

    // Two independent scope axes. Arrays are JSON-stringified so they survive
    // the POST as a scalar param the backend re-parses (parseSel handles both).
    const encSel = (sel) => (Array.isArray(sel) ? JSON.stringify(sel) : sel);
    const payload = {
      hub_id,
      // Subtree root — must match the nid sent to export_scope so the export
      // covers exactly what the modal showed.
      nid: this.mget(_a.nid) || null,
      format: this._format,
      folder_sel: encSel(this._folderSel), // 'all' | JSON array of folder nids | 'none'
      thread_sel: encSel(this._threadSel), // 'all' | JSON array of thread ids | 'none'
      start_date: this._dateEnabled ? this._startDate : null,
      end_date: this._dateEnabled ? this._endDate : null,
    };

    let data;
    try {
      data = await this.postService(SERVICE.channel.export, payload);
    } catch (e) {
      this.warn("chat-export: export request failed", e);
      this._showProgressError(LOCALE.AN_ERROR_OCCURRED);
      return;
    }

    if (!data) return;

    // Handle backend early-reject status codes before any download logic.
    const { status, wait, zipid, zipname, format } = data;

    if (status === "EXPORT_TOO_LARGE") {
      this._showProgressError(
        `${LOCALE.EXPORT_TOO_LARGE} ${LOCALE.NARROW_DATE_RANGE}`,
      );
      return;
    }

    if (status === "MISSING_SOCKET_ID") {
      this._showProgressError(LOCALE.MISSING_SOCKET_ID);
      return;
    }

    if (wait === 0 || format === "json") {
      // JSON: download immediately
      this._triggerDownload(data);
      return;
    }

    // PDF: wait === 1 → show progress. The WS "finished" event (onWsMessage)
    // triggers the download when it arrives, but offline-worker progress over
    // WS is unreliable, so we ALSO poll export_fetch until the staged file is
    // ready (404 while generating → 200 + file when done). Whichever path
    // fires first wins; _activeZipId guards against a double download.
    this._activeZipId = zipid;
    this.mset({ zipid, zipname });
    // Flip the Download button into its spinner "Generating" state (replaces
    // the former thin progress bar). Cleared on WS "done" / poll success /
    // error, which re-feeds the skeleton to restore the Download button.
    this._setGenerating(true);
    this._pollDownload(data, 0);
  }

  /**
   * Toggle the generating state and re-feed so the Download button reflects it.
   * Mirrors the widget's existing "re-feed the whole card" pattern used by the
   * format/scope/date toggles (the framework diffs efficiently).
   */
  _setGenerating(on) {
    this._generating = !!on;
    this.feed(require("./skeleton").default(this));
  }

  /**
   * Build the export_fetch URL for the staged file. Shared by the immediate
   * (JSON) download and the polled (PDF) download so both hit the exact same
   * authenticated endpoint.
   */
  _exportFetchUrl(data) {
    const { zipid, zipname } = data;
    const { svc, keysel } = bootstrap();
    const hub_id = this.mget(_a.hub_id);
    return `${svc}${SERVICE.channel.export_fetch}?hub_id=${hub_id}&zipid=${zipid}&keysel=${keysel}&zipname=${encodeURIComponent(zipname || "chat-export")}`;
  }

  /**
   * Poll export_fetch until the offline worker has staged the file.
   * not_found → HTTP 404 while still generating; 200 + body when ready.
   * Retries every 1.5s up to ~90s, then surfaces an error.
   */
  _pollDownload(data, tries = 0) {
    if (this._activeZipId !== data.zipid) return; // already downloaded (WS path)
    const retry = () => {
      if (this._activeZipId !== data.zipid) return;
      if (tries < 60) {
        this._downloadTimer = setTimeout(
          () => this._pollDownload(data, tries + 1),
          1500,
        );
      } else {
        this._activeZipId = null;
        this._setGenerating(false); // restore Download button, then show error
        this._showProgressError(LOCALE.AN_ERROR_OCCURRED);
      }
    };
    fetch(this._exportFetchUrl(data), { credentials: "same-origin" })
      .then((resp) => (resp && resp.ok ? resp.blob() : null))
      .then((blob) => {
        if (this._activeZipId !== data.zipid) return; // WS path won the race
        if (!blob) return retry();
        this._activeZipId = null;
        this._setGenerating(false); // restore Download button
        this._saveBlob(blob, data.zipname);
      })
      .catch(() => retry());
  }

  /**
   * Force a browser download from an in-memory Blob (used by the polled PDF
   * path, which already holds the fetched bytes).
   */
  _saveBlob(blob, filename) {
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = filename || "chat-export";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objUrl), 2000);
  }

  /**
   * Trigger browser file download using the a.download pattern
   * (mirrored from settings/export-data).
   * Backend serves the staged file via SERVICE.channel.export_fetch
   * with params {zipid, zipname} (NOT id= and NOT chat_export_download).
   */
  _triggerDownload(data) {
    const { zipid, zipname } = data;
    if (!zipid) {
      this.warn("chat-export: missing zipid in response", data);
      return;
    }
    const a = document.createElement("a");
    a.href = this._exportFetchUrl(data);
    a.download = zipname || "chat-export";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ------------------------------------------------------------------ WS handler

  onWsMessage(service, data, opts = {}) {
    switch (service) {
      case SERVICE.channel.export: {
        if (!data || !data.zipid) break;
        if (data.zipid !== this._activeZipId) break;
        this._handleExportProgress(data);
        break;
      }
      default:
        if (super.onWsMessage) super.onWsMessage(service, data, opts);
    }
  }

  _handleExportProgress(data) {
    if (data.exit === 0) {
      // Done — restore the Download button and trigger download.
      this._activeZipId = null;
      this._setGenerating(false);
      this._triggerDownload(data);
      return;
    }
    if (data.exit > 0) {
      // Error — PDF generation failed on the server. Restore the button, then
      // surface the error in the progress area.
      this._activeZipId = null;
      this._setGenerating(false);
      this._showProgressError(LOCALE.AN_ERROR_OCCURRED);
      return;
    }
    // In-progress (BEING_CREATED): the button spinner is indeterminate, so
    // there is nothing to update — just keep spinning until exit===0.
  }

  // ------------------------------------------------------------------ error display

  /**
   * Renders a LOCALE-backed error message in the progress-area region.
   * Used for backend early-reject status codes (EXPORT_TOO_LARGE,
   * MISSING_SOCKET_ID) and network failures so the modal never hangs silently.
   * @param {string} message
   */
  _showProgressError(message) {
    this.ensurePart("progress-area").then((area) => {
      if (!area || (area.isDestroyed && area.isDestroyed())) return;
      area.feed(
        Skeletons.Note({
          className: `${this.fig.family}__progress-error`,
          content: message,
        }),
      );
    });
  }

  // ------------------------------------------------------------------ close

  _closeModal() {
    this.triggerHandlers({ service: "close-export" });
    this.goodbye();
  }
}

module.exports = __widget_chat_export;
