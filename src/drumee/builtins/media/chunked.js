/**
 * Chunked, parallel, resumable upload for large files.
 *
 * A plain media.upload rides ONE request for the whole file: on a slow link a
 * 40 GB file is a multi-hour request that restarts from zero on any network
 * blip, and the server only sees the file once the last byte lands. Here the
 * file is cut into chunks (size chosen by the server), PARALLEL of them are
 * in flight at once, each one retries on its own, and a finished session is
 * committed with media.upload_complete (a rename on the server, so no wait at
 * 100%). A session survives a reload: the upload_id is remembered per file in
 * localStorage, and on the next attempt media.upload_status tells which
 * chunks are already there. A link that drops mid-way PAUSES the upload
 * (nothing is retried, nothing is lost): it resumes on the browser's online
 * event, on a 30 s probe, or from the popup's Resume button.
 *
 * chunkedUpload() mirrors the contract of uploadFile() from ui-essentials so
 * both callers (media/uploader and media/bundle/job) can swap it in without
 * changing their hooks: it calls onUploadProgress / onLoad / onUploadResponse
 * / onUploadError / onAbort / onUploadEnd on `ctx`, and returns an xhr-like
 * handle (status, responseText, readyState, upload.file, abort(),
 * addEventListener("load"|"readystatechange")).
 */
const { uploadFile, postService } = require("@drumee/ui-essentials");

/** Files at or above this size go chunked; smaller ones keep the single request. */
const CHUNK_THRESHOLD = 64 * 1024 * 1024;
const PARALLEL = 4;
const RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 3000, 7000];
const STORE_KEY = "drumee.chunked.sessions";
const SESSION_TTL_MS = 48 * 3600 * 1000;
/** xhr statuses that mean the link or the gateway is down, not that the server refused. */
const TRANSIENT_STATUS = new Set([0, 502, 503, 504]);
/** Paused for a network reason: try again on our own this often (besides the browser's online event). */
const PAUSE_PROBE_MS = 30 * 1000;
/** A chunk with no progress event for this long is abandoned and treated as a dropped link. */
const CHUNK_STALL_MS = 45 * 1000;

/** Whether a dropped/picked item can go through the chunked path. */
function isChunkable(file) {
  return !!(file && typeof file.slice === "function" && Number(file.size) >= CHUNK_THRESHOLD);
}

function sessionKey(file, opt) {
  return [file.name, file.size, file.lastModified || 0, opt.hub_id || "", opt.nid || ""].join("|");
}

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    for (const k of Object.keys(all)) {
      if (!all[k] || now - (all[k].ctime || 0) > SESSION_TTL_MS) delete all[k];
    }
    return all;
  } catch (e) {
    return {};
  }
}

function saveSessions(all) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(all)); } catch (e) { /* private mode */ }
}

function rememberSession(key, upload_id) {
  const all = loadSessions();
  all[key] = { upload_id, ctime: Date.now() };
  saveSessions(all);
}

function forgetSession(key) {
  const all = loadSessions();
  if (all[key]) { delete all[key]; saveSessions(all); }
}

/**
 * Service call that throws on failure instead of raising the widget's
 * server-complain UI. A top-level {error} payload reaches onServerComplain,
 * which turns it into a real Error so the retry logic sees the reason.
 */
function callService(ctx, service, payload) {
  const quiet = {
    warn: (...a) => { if (ctx && ctx.warn) ctx.warn(...a); },
    onServerComplain(p) {
      const msg = (p && (p.error || p.reason || p.message)) || "service failed";
      throw Object.assign(new Error(String(msg)), { payload: p });
    },
  };
  return postService.call(quiet, service, payload);
}

/**
 * @param {object} ctx     the uploader widget/job (hooks + postService live here)
 * @param {File}   file
 * @param {object} opt     same params as uploadFile(): nid, hub_id, replace, ownpath, ...
 * @returns {object}       xhr-like handle
 */
function chunkedUpload(ctx, file, opt = {}) {
  const listeners = {};
  const inflight = new Set();
  const pendingChunks = new Set(); // settle fns of chunks awaiting an answer
  let pauseWaiters = [];
  let probeTimer = null;
  const releaseWaiters = () => {
    const w = pauseWaiters;
    pauseWaiters = [];
    for (const fn of w) fn();
  };
  const handle = {
    file,
    chunked: true,
    status: 0,
    responseText: "",
    readyState: 1,
    upload: { file },
    aborted: false,
    paused: false,
    pauseReason: null,
    abort() {
      if (handle.aborted) return;
      handle.aborted = true;
      for (const x of inflight) { try { x.abort(); } catch (e) { /* already done */ } }
      inflight.clear();
      // xhr.upload fires no abort once the body is fully sent, so a chunk that
      // was waiting for the server's answer would never settle: settle it here.
      for (const cancel of Array.from(pendingChunks)) cancel();
      handle.paused = false;
      releaseWaiters();
    },
    /**
     * Hold the upload without losing anything: failed chunks wait instead of
     * retrying, and the session stays valid. "offline" / "network" pauses come
     * from the transfer itself; anything else is the user.
     */
    pause(reason) {
      if (handle.aborted || handle.paused) return;
      handle.paused = true;
      handle.pauseReason = reason || "manual";
      if (handle.pauseReason !== "manual" && !probeTimer) {
        probeTimer = setTimeout(() => {
          probeTimer = null;
          if (handle.paused && navigator.onLine !== false) handle.resume();
        }, PAUSE_PROBE_MS);
      }
      if (typeof ctx.onUploadPaused === "function") {
        ctx.onUploadPaused({ file, reason: handle.pauseReason, target: handle.upload });
      }
    },
    /** Let the waiting chunks go again now (Resume button, online event, probe). */
    resume() {
      if (!handle.paused || handle.aborted) return;
      handle.paused = false;
      handle.pauseReason = null;
      if (probeTimer) { clearTimeout(probeTimer); probeTimer = null; }
      releaseWaiters();
      if (typeof ctx.onUploadResumed === "function") {
        ctx.onUploadResumed({ file, target: handle.upload });
      }
    },
    addEventListener(type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    },
  };
  const waitUntilResumed = () => new Promise((resolve) => {
    if (!handle.paused || handle.aborted) return resolve();
    pauseWaiters.push(resolve);
  });
  // The browser knows first when the link drops: pause at once instead of
  // letting four chunks time out, and pick up as soon as it is back.
  const onOffline = () => handle.pause("offline");
  const onOnline = () => { if (handle.paused && handle.pauseReason !== "manual") handle.resume(); };
  window.addEventListener("offline", onOffline);
  window.addEventListener("online", onOnline);
  const detach = () => {
    window.removeEventListener("offline", onOffline);
    window.removeEventListener("online", onOnline);
    if (probeTimer) { clearTimeout(probeTimer); probeTimer = null; }
  };
  /** A failure the network or the gateway is responsible for, not the server. */
  const isTransient = (e) =>
    navigator.onLine === false ||
    (e instanceof TypeError && /fetch|network|load failed/i.test(e.message || "")) ||
    TRANSIENT_STATUS.has(Number(e && e.status));
  const pauseFor = () => handle.pause(navigator.onLine === false ? "offline" : "network");
  /** Service call that waits out an outage instead of failing the upload. */
  const callWithPause = async (service, payload) => {
    for (;;) {
      if (handle.aborted) throw new Error("aborted");
      if (handle.paused) await waitUntilResumed();
      if (handle.aborted) throw new Error("aborted");
      try {
        return await callService(ctx, service, payload);
      } catch (e) {
        if (handle.aborted || !isTransient(e)) throw e;
        pauseFor();
      }
    }
  };
  const fire = (type) => {
    for (const fn of listeners[type] || []) { try { fn({ target: handle }); } catch (e) { /* listener bug */ } }
  };
  const progress = (loaded) => {
    if (typeof ctx.onUploadProgress !== "function") return;
    ctx.onUploadProgress({ lengthComputable: true, loaded, total: file.size, target: handle.upload });
  };
  const finish = (status, data, err) => {
    detach();
    handle.status = status;
    handle.readyState = 4;
    handle.responseText = JSON.stringify(status === 200 ? { data } : { error: err && err.message });
    fire("readystatechange");
    fire("load");
    if (status === 200) {
      if (typeof ctx.onLoad === "function") ctx.onLoad({ target: handle.upload });
      if (typeof ctx.onUploadResponse === "function") ctx.onUploadResponse(data);
      if (typeof ctx.onUploadEnd === "function") {
        ctx.onUploadEnd({ lengthComputable: true, loaded: file.size, total: file.size, target: handle.upload });
      }
    } else if (handle.aborted) {
      if (typeof ctx.onAbort === "function") ctx.onAbort({ target: handle.upload });
      else if (typeof ctx.onUploadEnd === "function") ctx.onUploadEnd({ lengthComputable: false, target: handle.upload });
    } else {
      if (typeof ctx.onUploadError === "function") ctx.onUploadError(ctx.pendingItem || { ...opt, file });
      if (typeof ctx.onUploadEnd === "function") ctx.onUploadEnd({ lengthComputable: false, target: handle.upload });
    }
  };

  const key = sessionKey(file, opt);
  const base = {
    nid: opt.nid, hub_id: opt.hub_id, replace: opt.replace || 0,
  };
  if (opt.ownpath) base.ownpath = opt.ownpath;
  if (opt.token) base.token = opt.token;
  if (ctx && typeof ctx.get === "function") {
    const sid = ctx.get(_a.socket_id);
    if (sid) base.socket_id = sid;
  }
  if (typeof ctx.verbose === "function") ctx.verbose(`Chunked upload ${file.name} (${file.size})`);
  ctx.pendingItem = { ...opt, file };

  (async () => {
    // 1) Open or resume the session.
    let init = null;
    const known = loadSessions()[key];
    if (known && known.upload_id) {
      try {
        const st = await callWithPause("media.upload_status", { ...base, upload_id: known.upload_id });
        if (st && st.upload_id && Number(st.filesize) === file.size) init = st;
      } catch (e) { /* stale session: start over */ }
      if (!init) forgetSession(key);
    }
    if (!init) {
      init = await callWithPause("media.upload_init", {
        ...base, filename: file.name, filesize: file.size,
      });
      if (!init || !init.upload_id) throw new Error((init && init.error) || "upload_init failed");
      rememberSession(key, init.upload_id);
    }
    const { upload_id, chunk_size, total } = init;
    const chunkLen = (i) => Math.min(chunk_size, file.size - i * chunk_size);
    const done = new Set((init.received || []).map(Number));
    let acked = 0;
    for (const i of done) acked += chunkLen(i);
    const partial = new Map(); // index -> bytes sent so far
    const report = () => {
      let sum = acked;
      for (const v of partial.values()) sum += v;
      progress(Math.min(file.size, sum));
    };
    report();

    // 2) One chunk = one small request through uploadFile(), with retries.
    const sendChunk = (i) => new Promise((resolve, reject) => {
      const start = i * chunk_size;
      const blob = file.slice(start, start + chunkLen(i));
      try { blob.name = file.name; } catch (e) { /* read-only in some engines */ }
      let xhr = null;
      let stallTimer = null;
      let settled = false;
      const settle = () => {
        settled = true;
        if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; }
        pendingChunks.delete(cancelNow);
        partial.delete(i);
        if (xhr) inflight.delete(xhr);
      };
      const cancelNow = () => { if (!settled) { settle(); reject(new Error("aborted")); } };
      pendingChunks.add(cancelNow);
      // A half-open connection raises no error and no progress event. After
      // CHUNK_STALL_MS of silence give this chunk up ourselves and report it
      // like a dropped link (status 0): the upload pauses instead of hanging
      // until the job's idle watchdog fails the whole file.
      const armStall = () => {
        if (stallTimer) clearTimeout(stallTimer);
        stallTimer = setTimeout(() => {
          stallTimer = null;
          if (settled) return;
          settle();
          if (xhr) { try { xhr.abort(); } catch (e) { /* already done */ } }
          reject(Object.assign(new Error(`chunk ${i} stalled`), { status: 0 }));
        }, CHUNK_STALL_MS);
      };
      const sub = {
        pendingItem: null,
        get: (k) => (ctx && typeof ctx.get === "function" ? ctx.get(k) : undefined),
        verbose() {},
        warn: (...a) => { if (ctx && ctx.warn) ctx.warn(...a); },
        onUploadProgress(e) {
          if (e && e.lengthComputable) { partial.set(i, e.loaded); report(); armStall(); }
        },
        onUploadResponse(data) {
          if (settled) return;
          settle();
          resolve(data);
        },
        onUploadError() {
          if (settled) return;
          // status 0 = no answer at all (link down); >= 400 = the server said no
          const status = xhr ? xhr.status : 0;
          settle();
          reject(Object.assign(new Error(`chunk ${i} failed`), { status }));
        },
        onAbort() {
          if (settled) return;
          settle();
          reject(new Error("aborted"));
        },
      };
      xhr = uploadFile.call(sub, blob, {
        ...base,
        service: "media.upload_chunk",
        upload: 1,
        upload_id,
        index: i,
        filename: file.name,
        filesize: file.size,
      });
      inflight.add(xhr);
      armStall();
    });
    const sendWithRetry = async (i) => {
      let attempt = 0;
      for (;;) {
        if (handle.aborted) throw new Error("aborted");
        if (handle.paused) await waitUntilResumed();
        if (handle.aborted) throw new Error("aborted");
        try {
          await sendChunk(i);
          acked += chunkLen(i);
          done.add(i);
          report();
          return;
        } catch (e) {
          if (handle.aborted) throw e;
          if (isTransient(e)) {
            // Link or gateway down: hold this chunk instead of burning retries.
            // It goes again on the browser's online event, the probe, or Resume.
            pauseFor();
            attempt = 0;
            continue;
          }
          if (attempt >= RETRIES - 1) throw e;
          await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt] || 7000));
          attempt += 1;
        }
      }
    };

    // 3) Bounded-parallel pool over the missing chunks.
    const queue = [];
    for (let i = 0; i < total; i++) if (!done.has(i)) queue.push(i);
    const workers = [];
    for (let w = 0; w < Math.min(PARALLEL, queue.length || 1); w++) {
      workers.push((async () => {
        while (queue.length && !handle.aborted) {
          const i = queue.shift();
          await sendWithRetry(i);
        }
      })());
    }
    await Promise.all(workers);
    if (handle.aborted) throw new Error("aborted");

    // 4) Commit. INCOMPLETE means a chunk did not land after all: send those and retry once.
    let res = await callWithPause("media.upload_complete", {
      ...base, upload_id, filename: file.name, filesize: file.size,
    });
    if (res && res.error === "INCOMPLETE" && Array.isArray(res.missing) && res.missing.length) {
      for (const i of res.missing) { done.delete(i); await sendWithRetry(i); }
      res = await callWithPause("media.upload_complete", {
        ...base, upload_id, filename: file.name, filesize: file.size,
      });
    }
    if (!res || res.error) throw new Error((res && res.error) || "upload_complete failed");
    forgetSession(key);
    finish(200, res);
  })().catch((e) => {
    if (!handle.aborted && ctx && ctx.warn) ctx.warn("chunked upload failed", file.name, e && e.message);
    if (handle.readyState !== 4) finish(handle.aborted ? 0 : 500, null, e);
  });

  return handle;
}

module.exports = { chunkedUpload, isChunkable, CHUNK_THRESHOLD, PARALLEL };
