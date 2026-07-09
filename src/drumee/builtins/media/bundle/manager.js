// src/drumee/builtins/media/bundle/manager.js
// Singleton: run up to MAX_JOBS bundle jobs concurrently per user; queue the rest.
// Owns one shared ThroughputGovernor so the 100 MB/s cap is aggregate.
const { ThroughputGovernor } = require("media/bundle/governor");
const BundleJob = require("media/bundle/job");

// One active bundle at a time — parallel jobs were overwhelming the gateway (504).
const MAX_JOBS = 1;

class _BundleManager {
  constructor() {
    this.governor = new ThroughputGovernor();
    this._active = new Set();
    this._queue = [];
  }

  activeCount() { return this._active.size; }
  queuedCount() { return this._queue.length; }

  /**
   * Create a job and queue it. Does NOT start it — caller must attach listeners
   * then call pump(), so the first events (activated/progress) are not missed.
   * @param {object} spec { entries, destNid, hub_id, resolution }
   * @returns {BundleJob}
   */
  create(spec) {
    const job = new BundleJob({ ...spec, governor: this.governor });
    job.state = "queued";
    job.once("done", () => this._onJobDone(job));
    this._queue.push(job);
    return job;
  }

  pump() {
    while (this._active.size < MAX_JOBS && this._queue.length) {
      const job = this._queue.shift();
      this._active.add(job);
      job.state = "active";
      job.trigger("activated", { job });
      job.start(); // async, fire-and-forget; completion via "done"
    }
  }

  _onJobDone(job) {
    this._active.delete(job);
    const i = this._queue.indexOf(job);
    if (i >= 0) this._queue.splice(i, 1);
    this.pump();
  }

  /** Cancel every active and queued job (upload-progress "Cancel all"). */
  cancelAll() {
    for (const job of this._active) {
      if (job.cancel) job.cancel();
    }
    for (const job of this._queue) {
      if (job.cancel) job.cancel();
    }
    this._queue = [];
  }
}

// Single shared instance across the app.
if (!window.__bundleManager) window.__bundleManager = new _BundleManager();
module.exports = window.__bundleManager;
