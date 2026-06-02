// src/drumee/builtins/media/bundle/governor.js
// Shared throughput governor: approximate aggregate cap by gating file STARTS.
// report(bytes) is fed from every job's onUploadProgress; gateBeforeFile() waits
// while the rolling 1s rate is at/over the cap.

const DEFAULT_MAX = 100 * 1024 * 1024; // 100 MB/s aggregate
const WINDOW_MS = 1000;
const POLL_MS = 100;

const now = () => Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class ThroughputGovernor {
  constructor(maxBytesPerSec = DEFAULT_MAX) {
    this._max = maxBytesPerSec;
    this._samples = []; // [{t, bytes}]
  }

  report(bytes) {
    if (!(bytes > 0)) return;
    const t = now();
    this._samples.push({ t, bytes });
    this._trim(t);
  }

  _trim(t = now()) {
    const cutoff = t - WINDOW_MS;
    while (this._samples.length && this._samples[0].t < cutoff) this._samples.shift();
  }

  /** bytes/sec over the last WINDOW_MS */
  currentRate() {
    this._trim();
    let sum = 0;
    for (const s of this._samples) sum += s.bytes;
    return sum * (1000 / WINDOW_MS);
  }

  /** Resolve when current rate is below the cap (approximate, file-granularity).
   *  Returns true if the 30s starvation guard fired (still over cap on resolve). */
  async gateBeforeFile() {
    let waited = 0;
    while (this.currentRate() >= this._max && waited < 30000) {
      await sleep(POLL_MS);
      waited += POLL_MS;
    }
    return waited >= 30000;
  }
}

module.exports = { ThroughputGovernor, DEFAULT_MAX };
