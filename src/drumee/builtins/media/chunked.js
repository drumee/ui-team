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
 * chunks are already there.
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
  const handle = {
    file,
    chunked: true,
    status: 0,
    responseText: "",
    readyState: 1,
    upload: { file },
    aborted: false,
    abort() {
      if (handle.aborted) return;
      handle.aborted = true;
      for (const x of inflight) { try { x.abort(); } catch (e) { /* already done */ } }
      inflight.clear();
    },
    addEventListener(type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    },
  };
  const fire = (type) => {
    for (const fn of listeners[type] || []) { try { fn({ target: handle }); } catch (e) { /* listener bug */ } }
  };
  const progress = (loaded) => {
    if (typeof ctx.onUploadProgress !== "function") return;
    ctx.onUploadProgress({ lengthComputable: true, loaded, total: file.size, target: handle.upload });
  };
  const finish = (status, data, err) => {
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
        const st = await callService(ctx, "media.upload_status", { ...base, upload_id: known.upload_id });
        if (st && st.upload_id && Number(st.filesize) === file.size) init = st;
      } catch (e) { /* stale session: start over */ }
      if (!init) forgetSession(key);
    }
    if (!init) {
      init = await callService(ctx, "media.upload_init", {
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
      const sub = {
        pendingItem: null,
        get: (k) => (ctx && typeof ctx.get === "function" ? ctx.get(k) : undefined),
        verbose() {},
        warn: (...a) => { if (ctx && ctx.warn) ctx.warn(...a); },
        onUploadProgress(e) {
          if (e && e.lengthComputable) { partial.set(i, e.loaded); report(); }
        },
        onUploadResponse(data) {
          partial.delete(i);
          if (xhr) inflight.delete(xhr);
          resolve(data);
        },
        onUploadError() {
          partial.delete(i);
          if (xhr) inflight.delete(xhr);
          reject(new Error(`chunk ${i} failed`));
        },
        onAbort() {
          partial.delete(i);
          if (xhr) inflight.delete(xhr);
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
    });
    const sendWithRetry = async (i) => {
      for (let attempt = 0; ; attempt++) {
        if (handle.aborted) throw new Error("aborted");
        try {
          await sendChunk(i);
          acked += chunkLen(i);
          done.add(i);
          report();
          return;
        } catch (e) {
          if (handle.aborted || attempt >= RETRIES - 1) throw e;
          await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt] || 7000));
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
    let res = await callService(ctx, "media.upload_complete", {
      ...base, upload_id, filename: file.name, filesize: file.size,
    });
    if (res && res.error === "INCOMPLETE" && Array.isArray(res.missing) && res.missing.length) {
      for (const i of res.missing) { done.delete(i); await sendWithRetry(i); }
      res = await callService(ctx, "media.upload_complete", {
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
