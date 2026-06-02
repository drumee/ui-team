// src/drumee/builtins/media/bundle/job.js
// Recursive orchestrator for one bundle. Extends LetcBox to inherit postService;
// binds uploadFile from ui-essentials. Sequential: one file/make_dir at a time.
// Emits via Backbone events: "progress" | "file-done" | "folder-created" | "error" | "done".
const { uploadFile } = require("@drumee/ui-essentials");

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

  cancel() {
    this._canceled = true;
    if (this._currentXhr && this._currentXhr.abort) this._currentXhr.abort();
  }

  async _uploadEntry(entry, destNid) {
    if (this._canceled) return;
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
      const node = await this.postService(SERVICE.media.make_dir, {
        hub_id: this._hubId,
        nid: destNid,
        socket_id: Visitor.get(_a.socket_id),
        dirname: entry.name,
      });
      newNid = node && (node.nid || node.home_id);
      if (!newNid) throw new Error("make_dir returned no nid");
      entry.status = "uploading";
      this.trigger("folder-created", { job: this, entry, nid: newNid });
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
    if (this._canceled) { entry.status = "skipped"; return; }
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
      } catch (e) {
        this._failOrResolve(entry, e);
      }
    });
  }

  // ---- uploadFile hooks (one in-flight at a time) ----
  onUploadProgress(e) {
    if (!this._current || !e.lengthComputable) return;
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
    const { entry, resolve } = this._current;
    entry.status = "done";
    this.filesDone += 1;
    this._current = null; this._currentXhr = null;
    this.trigger("file-done", { job: this, entry, data });
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
      } catch (e) { this._failOrResolve(entry, e); }
      return;
    }
    entry.status = "error";
    entry.error = "upload failed";
    this._current = null; this._currentXhr = null;
    this.trigger("error", { job: this, entry, error: entry.error });
    resolve();
  }

  onAbort() {
    if (!this._current) return;
    const { entry, resolve } = this._current;
    entry.status = "skipped";
    this._current = null; this._currentXhr = null;
    resolve();
  }

  _failOrResolve(entry, e) {
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
