// src/drumee/builtins/media/bundle/job.js
// Recursive orchestrator for one bundle. Extends LetcBox to inherit postService;
// binds uploadFile from ui-essentials. Sequential: one file/make_dir at a time.
// Emits via Backbone events: "progress" | "file-done" | "folder-created" | "error" | "done".
const { uploadFile } = require("@drumee/ui-essentials");

// Per-operation timeouts so an unresponsive server (a 504 with no parsable body,
// or a connection that hangs with no response at all) fails THAT step instead of
// freezing the whole bundle. These don't fix server errors — they keep the queue
// moving and leave the file/folder retryable.
const UPLOAD_IDLE_MS = 120000;   // no upload progress for this long → stalled
const MKDIR_TIMEOUT_MS = 90000;  // make_dir must respond within this

class __bundle_job extends LetcBox {
  initialize(opt = {}) {
    super.initialize(opt);
    this.uploadFile = uploadFile.bind(this); // postService is bound by LetcBox
    this._entries = opt.entries || [];
    this._destNid = opt.destNid;
    this._hubId = opt.hub_id;
    this._governor = opt.governor;
    this._resolution = opt.resolution || { mode: "rename", skip: new Set() }; // §5.6
    this._canceled = false;
    this._retried = {};
    this._current = null; // { entry, resolve, loaded }
    this.bytesTotal = require("media/bundle/entry").countSize(this._entries);
    this.bytesDone = 0;
    this.filesTotal = this._countFiles(this._entries);
    this.filesDone = 0;
  }

  _countFiles(list) {
    let n = 0;
    for (const e of list) n += e.kind === "file" ? 1 : this._countFiles(e.children);
    return n;
  }

  _clearWatchdog() {
    if (this._watchdog) { clearTimeout(this._watchdog); this._watchdog = null; }
  }

  // Idle watchdog for the in-flight upload: reset on every progress tick, so it
  // only fires when the connection has produced NOTHING for UPLOAD_IDLE_MS — i.e.
  // the server stalled with no response. We then fail this file (and abort the
  // dead XHR) so the bundle continues instead of hanging forever.
  _armWatchdog(entry) {
    this._clearWatchdog();
    this._watchdog = setTimeout(() => {
      this._watchdog = null;
      if (!this._current || this._current.entry !== entry) return;
      this.warn("upload stalled (idle timeout)", entry.name);
      const xhr = this._currentXhr;
      this._failOrResolve(entry, new Error("upload stalled"));
      if (xhr && xhr.abort) { try { xhr.abort(); } catch (e) { } }
    }, UPLOAD_IDLE_MS);
  }

  // Reject if `promise` doesn't settle within ms (used for make_dir, which has no
  // progress events to watchdog). The underlying request may keep running, but the
  // bundle stops waiting on it.
  _withTimeout(promise, ms, label) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error((label || "request") + " timed out")), ms);
      Promise.resolve(promise).then(
        (v) => { clearTimeout(t); resolve(v); },
        (e) => { clearTimeout(t); reject(e); }
      );
    });
  }

  async start() {
    try {
      for (const root of this._entries) {
        if (this._canceled) break;
        await this._uploadEntry(root, this._destNid);
      }
      this.trigger("done", { job: this, canceled: this._canceled });
    } catch (e) {
      this.trigger("error", { job: this, fatal: true, error: e && e.message });
      this.trigger("done", { job: this, canceled: this._canceled });
    }
  }

  /**
   * Stop this bundle and settle every entry that had not finished.
   *
   * @param {string} [reason] why it stopped, e.g. "permission" when the viewer
   *        lost write access mid-upload. Stored on each cancelled entry so the
   *        UI can explain the row rather than just marking it failed.
   */
  cancel(reason) {
    this._canceled = true;
    this._cancelReason = reason || null;
    this._clearWatchdog();
    if (this._currentXhr && this._currentXhr.abort) this._currentXhr.abort();
    // Aborting the live XHR settles ONE entry (via onAbort). Everything else in
    // the tree is still sitting at its pre-cancel status: entries the loop had
    // not reached yet are "queued" (their spinner would keep turning forever),
    // and folders mid-recursion are "creating"/"uploading". Walk the whole tree
    // and settle them, or the popup keeps promising work that will never run.
    this._markCanceled(this._entries);
  }

  /** Depth-first: mark every non-terminal entry as cancelled. */
  _markCanceled(list) {
    for (const e of list || []) {
      if (e.kind === "folder") this._markCanceled(e.children);
      // "done"/"skipped"/"error" are final — a file that finished before the
      // cancel really did upload, and must keep saying so.
      if (e.status === "done" || e.status === "skipped" || e.status === "error") {
        continue;
      }
      e.status = "canceled";
      e.cancelReason = this._cancelReason;
    }
  }

  /** Manually re-run a single failed entry (file or folder) into its stored parent nid. */
  async retry(entry) {
    if (this._canceled || !entry) return;
    this._retried[entry.id] = 0;          // fresh auto-retry budget for this attempt
    entry.error = null;
    const parentNid = (entry._parentNid != null) ? entry._parentNid : this._destNid;
    await this._uploadEntry(entry, parentNid);
  }

  async _uploadEntry(entry, destNid) {
    if (this._canceled) return;
    entry._parentNid = destNid;
    if (entry.kind === "file") {
      if (this._resolution.skip.has(entry.relpath)) {
        entry.status = "skipped";
        this.trigger("file-done", { job: this, entry, skipped: true });
        return;
      }
      await this._uploadOneFile(entry, destNid);
      return;
    }
    // folder: create first, then recurse children into the new nid
    entry.status = "creating";
    this.trigger("progress", { job: this, entry });
    let newNid;
    try {
      const node = await this._withTimeout(
        this.postService(SERVICE.media.make_dir, {
          hub_id: this._hubId,
          nid: destNid,
          socket_id: Visitor.get(_a.socket_id),
          dirname: entry.name,
        }),
        MKDIR_TIMEOUT_MS, "make_dir"
      );
      newNid = node && (node.nid || node.home_id);
      if (!newNid) throw new Error("make_dir returned no nid");
      entry.nid = newNid;          // for click-to-focus from the progress popup
      entry.hub_id = this._hubId;
      entry.status = "uploading";
      // Carry the full server node + the dir it was created into, so the progress
      // popup can live-append this folder to the grid (per-item, no reload).
      this.trigger("folder-created", { job: this, entry, nid: newNid, node, parent: destNid });
    } catch (e) {
      const detail = (e && e.message) || "make_dir failed";
      entry.status = "error";
      entry.error = `Failed to create folder "${entry.name}": ${detail}`;
      this.trigger("error", { job: this, entry, error: entry.error });
      return; // skip subtree (cannot upload without a nid)
    }
    for (const child of entry.children) {
      if (this._canceled) return;
      await this._uploadEntry(child, newNid);
    }
    entry.status = "done";
  }

  async _uploadOneFile(entry, destNid) {
    await this._governor.gateBeforeFile();
    // The governor gate can hold a file for a while, so the job may have been
    // cancelled meanwhile. _markCanceled has already given this entry its
    // verdict — don't overwrite it with the softer "skipped".
    if (this._canceled) return;
    return new Promise((resolve) => {
      entry.status = "uploading";
      const opt = {
        nid: destNid,
        hub_id: this._hubId,
        single: 1,
        notify: 0,
        replace: this._resolution.mode === "replace" ? 1 : 0,
      };
      // Sequential invariant: exactly one XHR is in flight per job, so a single
      // `_current` slot is safe. Each terminal hook (onUploadResponse/onUploadError/
      // onAbort) nulls `_current` before resolve(); any later duplicate XHR event
      // no-ops via the `if (!this._current) return` guard. `destNid`/`opt` are stored
      // so a retry re-uploads to the SAME parent folder (not the bundle root).
      this._current = { entry, resolve, loaded: 0, destNid, opt };
      try {
        this._currentXhr = this.uploadFile(entry.source, opt);
        // Recovery net: uploadFile's onReadyStateChange JSON.parses the response
        // BEFORE checking status, so a non-200 with a non-JSON body (e.g. a 504
        // gateway HTML page) makes it throw and return WITHOUT calling any hook —
        // leaving this promise unresolved and STALLING the whole bundle. Catch the
        // failed response here so this file errors and the queue keeps moving
        // (the user can Retry it from the progress popup once the server recovers).
        const xhr = this._currentXhr;
        if (xhr && typeof xhr.addEventListener === "function") {
          xhr.addEventListener("readystatechange", () => {
            if (xhr.readyState !== 4) return;
            if (xhr.status && xhr.status !== 200 &&
                this._current && this._current.entry === entry) {
              this._failOrResolve(entry, new Error("HTTP " + xhr.status));
            }
          });
        }
        this._armWatchdog(entry);
      } catch (e) {
        this._failOrResolve(entry, e);
      }
    });
  }

  // ---- uploadFile hooks (one in-flight at a time) ----
  onUploadProgress(e) {
    if (!this._current || !e.lengthComputable) return;
    this._armWatchdog(this._current.entry);   // activity → keep this file alive
    const delta = e.loaded - this._current.loaded;
    this._current.loaded = e.loaded;
    if (delta > 0) {
      this.bytesDone += delta;
      if (this._governor) this._governor.report(delta);
      this.trigger("progress", { job: this, entry: this._current.entry, loaded: e.loaded, total: e.total });
    }
  }

  onUploadResponse(data) {
    if (!this._current) return;
    this._clearWatchdog();
    const { entry, resolve, destNid } = this._current;
    entry.status = "done";
    // Remember the server node so the progress popup can focus it on click.
    entry.nid = (data && (data.nid || (data.media && data.media.nid))) || entry.nid;
    entry.hub_id = this._hubId;
    this.filesDone += 1;
    this._current = null; this._currentXhr = null;
    // `parent` = dir this file was uploaded into; lets the popup live-append a
    // top-level file root to the grid as it completes (per-item, no reload).
    this.trigger("file-done", { job: this, entry, data, parent: destNid });
    resolve();
  }

  onUploadError() {
    if (!this._current) return;
    const { entry, resolve, opt } = this._current;
    const n = this._retried[entry.id] || 0;
    if (n < 2 && !this._canceled) {
      this._retried[entry.id] = n + 1;
      this._current.loaded = 0;
      try {
        // Reuse the stored opt so the retry targets the file's real parent folder.
        this._currentXhr = this.uploadFile(entry.source, opt);
        this._armWatchdog(entry);
      } catch (e) { this._failOrResolve(entry, e); }
      return;
    }
    this._clearWatchdog();
    entry.status = "error";
    entry.error = "upload failed";
    this._current = null; this._currentXhr = null;
    this.trigger("error", { job: this, entry, error: entry.error });
    resolve();
  }

  onAbort() {
    if (!this._current) return;
    this._clearWatchdog();
    const { entry, resolve } = this._current;
    // An abort means one of two very different things, and the UI shows them
    // differently: cancel() aborts the live XHR, so a cancelled job lands here
    // a tick after _markCanceled already settled this entry — leave that verdict
    // alone. Any other abort (the idle watchdog) is a plain skip.
    if (!this._canceled) entry.status = "skipped";
    this._current = null; this._currentXhr = null;
    resolve();
  }

  _failOrResolve(entry, e) {
    this._clearWatchdog();
    entry.status = "error";
    entry.error = (e && e.message) || "send failed";
    const cur = this._current;
    this._current = null; this._currentXhr = null;
    this.trigger("error", { job: this, entry, error: entry.error });
    if (cur) cur.resolve();
  }
}
__bundle_job.initClass();
module.exports = __bundle_job;
